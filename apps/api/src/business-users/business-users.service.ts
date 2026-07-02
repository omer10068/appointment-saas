import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessInvitationStatus,
  BusinessUser,
  BusinessUserRole,
  BusinessUserStatus,
  Prisma,
  User,
  UserStatus,
} from '../generated/prisma/client';
import { CreateBusinessOwnerDto } from '../admin/dto/create-business-owner.dto';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../dashboard/phone.util';
import { ClerkInvitationsService } from '../auth/clerk-invitations.service';

@Injectable()
export class BusinessUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clerkInvitations: ClerkInvitationsService,
  ) {}

  /**
   * Creates (or resumes inviting) the first OWNER of a business via a Clerk
   * Application Invitation.
   *
   * Ordering guarantee: internal state (User, BusinessUser, BusinessInvitation)
   * is persisted and committed BEFORE Clerk is ever called. This guarantees the
   * invariant that a Clerk invitation email can never carry a businessInvitationId
   * that doesn't already exist in Postgres — if Clerk fails, or if this process
   * crashes before confirming the Clerk invitation id, no email has gone out
   * referencing an unknown id, because the id was already committed first.
   *
   * The one residual gap this does NOT fully close (documented, not silently
   * hidden): if the Clerk call succeeds but the follow-up write that persists
   * `clerkInvitationId` fails (process crash, DB blip), we cannot distinguish
   * "Clerk never got the request" from "Clerk sent it and we just failed to
   * record the id" without querying Clerk's invitation list and reconciling by
   * email — which this patch does not implement. `clerkSendAttemptedAt` at
   * least makes that ambiguous window visible and honestly labeled rather than
   * indistinguishable from "never tried"; a retry in that window is safe from
   * an orphan-record perspective (the row already exists) but may, depending on
   * Clerk's exact `ignoreExisting` semantics (not independently verified against
   * a live Clerk instance as of this patch), result in a second Clerk-side
   * invitation object for the same email. See docs/backend-roadmap.md.
   */
  async createOwnerForBusiness(
    businessId: string,
    dto: CreateBusinessOwnerDto,
    invitedByUserId: string,
  ): Promise<BusinessUser> {
    let phoneNormalized: string;
    try {
      phoneNormalized = normalizePhone(dto.phone);
    } catch {
      throw new BadRequestException('Invalid phone number');
    }

    const email = dto.email.trim().toLowerCase();

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // ── Phase 1: persist internal state first (single transaction, no Clerk call yet) ──
    // Serializable isolation: the "no existing owner" read and the OWNER-row
    // insert both happen inside this one transaction with no external I/O in
    // between (unlike the old eager-Clerk-call version, where a slow Clerk
    // round-trip sat between the check and the write and gave concurrent
    // requests a wide window to race). Two concurrent admin double-submissions
    // for the same business could still both pass a plain READ COMMITTED
    // check before either commits; Serializable makes Postgres detect that
    // write conflict and abort one side with a retryable error, which we
    // translate to the same ConflictException below rather than a raw 500.
    let phase1Result: {
      businessUser: BusinessUser;
      businessInvitationId: string;
    };
    try {
      phase1Result = await this.prisma.$transaction(
        async (tx) => {
          const existingOwnerBU = await tx.businessUser.findFirst({
            where: { businessId, role: BusinessUserRole.OWNER },
            include: { businessInvitation: true },
          });

          if (existingOwnerBU) {
            if (existingOwnerBU.status === BusinessUserStatus.ACTIVE) {
              throw new ConflictException('Business already has an owner');
            }

            const inv = existingOwnerBU.businessInvitation;
            const stillValid =
              !!inv &&
              inv.status === BusinessInvitationStatus.PENDING &&
              !!inv.clerkInvitationId &&
              !!inv.expiresAt &&
              inv.expiresAt > new Date();
            if (stillValid) {
              throw new ConflictException(
                'An invitation has already been sent to this business owner',
              );
            }
            // Prior attempt never confirmed a Clerk send, or the invitation
            // expired — fall through and retry using the SAME BusinessUser +
            // BusinessInvitation row.
          }

          // Resolve the target internal User: the already-linked user on retry,
          // otherwise by phone then email.
          let user: User | null;
          if (existingOwnerBU) {
            user = await tx.user.findUnique({
              where: { id: existingOwnerBU.userId },
            });
          } else {
            user = await tx.user.findUnique({ where: { phoneNormalized } });
            if (!user) {
              user = await tx.user.findUnique({ where: { email } });
            }
          }

          // Fail closed: an already-Clerk-linked user cannot safely receive an
          // OWNER invitation today. ClerkAuthGuard's fast path resolves an
          // already-linked identity by clerkUserId alone and returns before ever
          // consulting invitation publicMetadata again — so an invitation sent
          // to this person could never be claimed through normal login. This is
          // a known, documented limitation (see docs/backend-roadmap.md TODO:
          // "multi-business / second-invitation claim support") — MUST NOT be
          // silently bypassed by sending an invitation that can never be
          // claimed. Do not remove this check without first implementing a real
          // claim path for already-linked identities.
          if (user?.clerkUserId) {
            throw new ConflictException(
              'This person already has a linked account and cannot currently be invited ' +
                'as the owner of an additional business. Multi-business invitations for ' +
                'an already-linked account are not supported yet.',
            );
          }

          if (!user) {
            user = await tx.user.create({
              data: { phoneNormalized, email, status: UserStatus.INVITED },
            });
          }
          // If an existing user was found, leave it untouched — it may already
          // be legitimately ACTIVE via membership in another business (just not
          // Clerk-linked, per the check above).

          const resolvedBusinessUser =
            existingOwnerBU ??
            (await tx.businessUser.create({
              data: {
                businessId,
                userId: user.id,
                role: BusinessUserRole.OWNER,
                status: BusinessUserStatus.INVITED,
              },
            }));

          const resolvedInvitationId =
            existingOwnerBU?.businessInvitation?.id ?? randomUUID();

          await tx.businessInvitation.upsert({
            where: { id: resolvedInvitationId },
            create: {
              id: resolvedInvitationId,
              businessId,
              businessUserId: resolvedBusinessUser.id,
              email,
              status: BusinessInvitationStatus.PENDING,
              clerkInvitationId: null,
              clerkSendAttemptedAt: null,
              expiresAt: null,
              invitedByUserId,
            },
            update: {
              status: BusinessInvitationStatus.PENDING,
              clerkInvitationId: null,
              clerkSendAttemptedAt: null,
              expiresAt: null,
              acceptedAt: null,
            },
          });

          return {
            businessUser: resolvedBusinessUser,
            businessInvitationId: resolvedInvitationId,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err: unknown) {
      // P2034: genuine Postgres Serializable write conflict (confirmed against
      // a real concurrent-transaction reproduction during hardening — this is
      // the expected, well-understood outcome of two racing owner-creation
      // requests). P2028 ("Transaction API error") is also translated here
      // because transaction-scoped failures under connection-pool contention
      // can surface through that code too. This is not an exhaustive mapping
      // of every possible transaction failure — a sufficiently unusual DB
      // error could still surface as a raw 500 rather than a clean 409 under
      // this catch. That residual gap is accepted for this patch rather than
      // building a general-purpose retry/error-classification layer.
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        ((err as { code: string }).code === 'P2034' ||
          (err as { code: string }).code === 'P2028')
      ) {
        throw new ConflictException('Business already has an owner');
      }
      throw err;
    }
    const { businessUser, businessInvitationId } = phase1Result;
    // Transaction committed here. User, BusinessUser (INVITED), and
    // BusinessInvitation (PENDING, clerkInvitationId null) now exist in
    // Postgres. The core safety invariant already holds from this point on:
    // Clerk has not been called yet, so there is no possibility of a Clerk
    // email referencing an id that doesn't exist.

    // ── Phase 2: call Clerk (outside the transaction — external I/O) ──
    // Mark the attempt BEFORE calling Clerk (not after), so a failure between
    // this write and the confirmation write below leaves a distinguishable
    // "attempted, unconfirmed" state instead of looking identical to "never
    // attempted".
    await this.prisma.businessInvitation.update({
      where: { id: businessInvitationId },
      data: { clerkSendAttemptedAt: new Date() },
    });

    const invitation = await this.clerkInvitations.createOwnerInvitation({
      email,
      businessInvitationId,
    });
    // If this throws, the BusinessInvitation row stays PENDING with
    // clerkInvitationId still null and clerkSendAttemptedAt set — a
    // deterministic, retryable state. The error (BadGatewayException)
    // propagates so Admin sees a clear failure; a retry re-enters this method,
    // finds the existing INVITED owner with an unconfirmed invitation, and
    // reuses this same businessInvitationId rather than minting a new one.

    // ── Phase 3: confirm ──
    await this.prisma.businessInvitation.update({
      where: { id: businessInvitationId },
      data: {
        clerkInvitationId: invitation.clerkInvitationId,
        expiresAt: invitation.expiresAt,
      },
    });

    return businessUser;
  }
}
