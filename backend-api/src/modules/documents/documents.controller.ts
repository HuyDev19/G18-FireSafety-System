import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@ApiTags('Documents - FR-08')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách hồ sơ điện tử' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách hồ sơ' })
  findAll(): ApiResponseEnvelope<{ documents: unknown[] }> {
    return this.documentsService.findAll();
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload hồ sơ/ảnh lên MinIO (<= 10MB)' })
  @ApiBody({ type: UploadDocumentDto })
  @ApiResponse({ status: 201, description: 'Upload hồ sơ thành công' })
  upload(@Body() dto: UploadDocumentDto): ApiResponseEnvelope<{ documentId: string }> {
    return this.documentsService.upload(dto);
  }
}
