import type {
  AppointmentStatus as ContractsStatus,
  DashboardAppointmentDto,
  DashboardServiceDto,
  DashboardServiceProviderDto,
} from '@appointment/contracts';
import type { Appointment, Service, ServiceColor, ServiceProvider } from './calendar.types';

// ─── Color assignment ─────────────────────────────────────────────────────────

const SERVICE_COLORS: ServiceColor[] = ['rose', 'mint', 'cream', 'lavender', 'sky'];

/**
 * Deterministic color from serviceId — same service always gets the same color
 * across renders, sessions, and fetches.
 */
function stableColorForId(id: string): ServiceColor {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) >>> 0;
  }
  return SERVICE_COLORS[hash % SERVICE_COLORS.length];
}

// ─── Status mapping ───────────────────────────────────────────────────────────

const STATUS_MAP: Record<ContractsStatus, Appointment['status']> = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED_BY_CUSTOMER: 'cancelled_by_customer',
  CANCELLED_BY_BUSINESS: 'cancelled_by_business',
  NO_SHOW: 'no_show',
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function mapDtoToService(dto: DashboardServiceDto): Service {
  return {
    id: dto.id,
    name: dto.name,
    durationMinutes: dto.durationMinutes,
    color: stableColorForId(dto.id),
  };
}

export function buildServiceMap(services: Service[]): Map<string, Service> {
  return new Map(services.map((s) => [s.id, s]));
}

export function mapDtoToServiceProvider(dto: DashboardServiceProviderDto): ServiceProvider {
  return {
    id: dto.id,
    name: dto.displayName,
    businessUserId: dto.businessUserId,
  };
}

export function mapDtoToAppointment(
  dto: DashboardAppointmentDto,
  serviceMap: Map<string, Service>,
): Appointment {
  // Prefer the full Service from the map; fall back to a minimal inline object
  // if services haven't loaded yet (avoids a blank render on first paint).
  const service: Service = serviceMap.get(dto.serviceId) ?? {
    id: dto.serviceId,
    name: dto.serviceName,
    durationMinutes: 0,
    color: stableColorForId(dto.serviceId),
  };

  return {
    id: dto.id,
    customer: {
      id: dto.businessCustomerId,
      name: dto.customerName,
    },
    service,
    provider: {
      id: dto.serviceProviderId,
      name: dto.serviceProviderName,
    },
    startTime: new Date(dto.startsAt),
    endTime: new Date(dto.endsAt),
    status: STATUS_MAP[dto.status] ?? 'scheduled',
  };
}
