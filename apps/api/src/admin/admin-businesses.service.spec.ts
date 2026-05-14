import { Test, TestingModule } from '@nestjs/testing';
import { BusinessesService } from '../businesses/businesses.service';
import { CreateBusinessDto } from '../businesses/dto/create-business.dto';
import { AdminBusinessesService } from './admin-businesses.service';

const mockBusiness = {
  id: 'biz-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockBusinessesService = {
  create: jest.fn(),
  findAll: jest.fn(),
};

describe('AdminBusinessesService', () => {
  let service: AdminBusinessesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminBusinessesService,
        { provide: BusinessesService, useValue: mockBusinessesService },
      ],
    }).compile();

    service = module.get<AdminBusinessesService>(AdminBusinessesService);
  });

  describe('create', () => {
    it('delegates to BusinessesService.create', async () => {
      const dto: CreateBusinessDto = { name: 'Acme Corp', slug: 'acme-corp' };
      mockBusinessesService.create.mockResolvedValue(mockBusiness);

      const result = await service.create(dto);

      expect(mockBusinessesService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockBusiness);
    });
  });

  describe('findAll', () => {
    it('delegates to BusinessesService.findAll', async () => {
      mockBusinessesService.findAll.mockResolvedValue([mockBusiness]);

      const result = await service.findAll();

      expect(mockBusinessesService.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockBusiness]);
    });
  });
});
