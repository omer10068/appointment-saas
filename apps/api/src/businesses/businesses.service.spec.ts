import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';

const mockBusiness = {
  id: 'biz-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockPrisma = {
  business: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('BusinessesService', () => {
  let service: BusinessesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BusinessesService>(BusinessesService);
  });

  describe('create', () => {
    const dto: CreateBusinessDto = { name: 'Acme Corp', slug: 'acme-corp' };

    it('creates and returns a business when the slug is available', async () => {
      mockPrisma.business.create.mockResolvedValue(mockBusiness);

      const result = await service.create(dto);

      expect(mockPrisma.business.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(mockBusiness);
    });

    it('throws ConflictException when the slug already exists (P2002)', async () => {
      mockPrisma.business.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('re-throws unknown errors', async () => {
      const unknown = new Error('db down');
      mockPrisma.business.create.mockRejectedValue(unknown);

      await expect(service.create(dto)).rejects.toThrow('db down');
    });
  });

  describe('findAll', () => {
    it('calls prisma.business.findMany with orderBy createdAt desc', async () => {
      mockPrisma.business.findMany.mockResolvedValue([mockBusiness]);

      const result = await service.findAll();

      expect(mockPrisma.business.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockBusiness]);
    });
  });
});
