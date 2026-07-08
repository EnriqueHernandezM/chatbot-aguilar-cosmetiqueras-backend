import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { SaveFromAgentUploadPayload } from './interfaces/save-from-agent-upload.interface';
import { Gallery } from './schemas/gallery.schema';

@Injectable()
export class GalleryService {
  constructor(
    @InjectModel(Gallery.name)
    private galleryModel: Model<Gallery>,
  ) {}

  async saveFromAgentUpload(payload: SaveFromAgentUploadPayload) {
    const tenantId = this.toObjectId(payload.tenantId);
    const uploadedBy = this.toObjectId(payload.uploadedBy);
    const url = payload.url.trim();

    return this.galleryModel.findOneAndUpdate(
      {
        tenantId,
        url,
      },
      {
        $setOnInsert: {
          uid: this.generateUid(),
          tenantId,
          uploadedBy,
          url,
          publicId: payload.publicId?.trim(),
          originalName: payload.originalName?.trim(),
          mimeType: payload.mimeType?.trim(),
          sizeBytes: payload.sizeBytes,
          title: payload.title?.trim(),
          caption: payload.caption?.trim(),
          category: payload.category?.trim(),
          tags: payload.tags ?? [],
          status: 'active',
        },
      },
      {
        new: true,
        upsert: true,
      },
    );
  }

  async findActiveByTenant(tenantId: string) {
    return this.galleryModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        status: 'active',
      })
      .sort({
        createdAt: -1,
        _id: -1,
      });
  }

  private generateUid() {
    return `gal_${new Types.ObjectId().toString()}`;
  }

  private toObjectId(value: string | Types.ObjectId) {
    return typeof value === 'string' ? new Types.ObjectId(value) : value;
  }
}
