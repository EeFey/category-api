import { Controller, Get, Query } from '@nestjs/common';
import { AttributesService } from './attributes.service';
import { GetAttributesDto } from './dto/get-attributes.dto';
import { AttributesPaginatedResponseDto } from './dto/attributes-paginated-response.dto';

@Controller('api/attributes')
export class AttributesController {
  constructor(private readonly svc: AttributesService) { }

  @Get()
  async list(@Query() dto: GetAttributesDto): Promise<AttributesPaginatedResponseDto> {
    return this.svc.getAttributes(dto);
  }
}
