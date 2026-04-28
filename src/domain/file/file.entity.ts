import type { FileDoc } from "../../db/types.js";
import type { FileDto } from "../../shared/dto.js";
import { fromObjectId } from "../../core/id.js";

export class File {
  constructor(private readonly doc: FileDoc) {}

  get id(): string { return fromObjectId(this.doc._id); }
  get tenantId(): string { return this.doc.tenantId; }
  get fileName(): string { return this.doc.fileName; }
  get fileSize(): number { return this.doc.fileSize; }
  get mimeType(): string { return this.doc.mimeType; }
  get uploadedBy(): string { return this.doc.uploadedBy; }
  get channel(): string { return this.doc.channel; }

  toDto(): FileDto {
    return {
      id: this.id,
      tenantId: this.tenantId,
      fileName: this.fileName,
      fileSize: this.fileSize,
      mimeType: this.mimeType,
      uploadedBy: this.uploadedBy,
      channel: this.channel,
      createdAt: this.doc.createdAt,
    };
  }
}
