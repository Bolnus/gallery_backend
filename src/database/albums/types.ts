import mongoose, { InferSchemaType } from "mongoose";
import { DocumentObjectId } from "../databaseTypes.js";
import { TagWithId } from "../tags/types.js";

export const AlbumsListSchema = new mongoose.Schema({
  albumName: { type: String, required: true, unique: true, trim: true },
  fullPath: { type: String, required: true, unique: true },
  albumSize: { type: Number, required: true },
  changedDate: { type: String, required: true },
  description: { type: String, trim: true },
  locale: { type: String, required: false, enum: ["en", "ru", ""] },
  /** "generating" | <generated id> */
  otherLangCopyGenerated: { type: String, required: false }
});

// Text search optimization, single index
AlbumsListSchema.index({ albumName: "text" });
AlbumsListSchema.index({ locale: 1 }); // Filtering
AlbumsListSchema.index({ albumName: 1, locale: 1 }); // Composite for filtered lookups
// AlbumsListSchema.index(
//   {
//     albumName: "text",
//     "albumNameLocalized.en": "text",
//     "albumNameLocalized.ru": "text"
//   },
//   {
//     name: "album_names_text",
//     sparse: true
//   }
// );
// Duplicates search optimization for nested fields
// AlbumsListSchema.index(
//   { "albumNameLocalized.en": 1 },
//   {
//     unique: true,
//     sparse: true,
//     name: "albumName_en_unique"
//   }
// );
// AlbumsListSchema.index(
//   { "albumNameLocalized.ru": 1 },
//   {
//     unique: true,
//     sparse: true,
//     name: "albumName_ru_unique"
//   }
// );

export type AlbumsListItem = InferSchemaType<typeof AlbumsListSchema> & Partial<DocumentObjectId>;
export type AlbumsListItemExport = Omit<AlbumsListItem, "fullPath">;

export interface AlbumsListWithTotal {
  albumsList: AlbumsListItemExport[];
  totalCount: number;
}

export type AlbumsDataListItem = AlbumsListItemExport & {
  tags: TagWithId[];
  pictureIds: string[];
};

export interface AlbumsDataWithTotal {
  albumsList: AlbumsDataListItem[];
  totalCount: number;
}

export interface AlbumsDataWithTotalObject {
  albumsList: AlbumsDataListItem[];
  totalCount: [
    {
      count: number;
    }
  ];
}
