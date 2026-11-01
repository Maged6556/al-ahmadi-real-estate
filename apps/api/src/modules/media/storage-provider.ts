export interface StorageProvider {
  uploadImage(input: { publicId: string; buffer: Buffer }): Promise<{
    publicId: string;
    url: string;
    width: number;
    height: number;
  }>;
  deleteImage(publicId: string): Promise<void>;
}
