import { Request } from "express";
import { CreateArtistInput, UpdateArtistInput } from "./artists.dto";
import { prisma } from "../../lib/prisma";
import { artistIndex } from "../../lib/meili";
import { generateEventCreateInfos, generateArtistCreateInfos, generateArtistUpdateInfos } from "../publicServices/createInfo.service";

export class ArtistsService {
    static async findById(id: string) {
        const artist = await prisma.artist.findFirst({ where: { id, deletedAt: null } });
        if (!artist) {
          const e: any = new Error('artist not found');
          e.status = 404; e.code = 'NOT_FOUND';
          throw e;
        }
        return artist;
      }
    
      static async findBySlug(slug: string) {
        const artist = await prisma.artist.findFirst({ 
          where: { 
            slug, 
            deletedAt: null 
          },
          include: {
            events: {
              select: {
                eventId: true
              }
            }
          } 
        });
        if (!artist) {
          const e: any = new Error('artist not found');
          e.status = 404; e.code = 'NOT_FOUND';
          throw e;
        }
        return artist;
      }

    static create = async function create(input: CreateArtistInput) {
      
    
      const [createInfoMeili, createInfoPrisma] = await generateArtistCreateInfos(input);
  
      const created = await prisma.artist.create({
        data: createInfoPrisma as any, // ts ile uğraşmamak için
      });
  
      // Add the artist to the meilisearch index
      artistIndex.addDocuments([{id: created.id, ...createInfoMeili}]);

    }      

    static update = async function update(id: string, input: UpdateArtistInput) {
      const existing = await prisma.artist.findFirst({ where: { id, deletedAt: null } });
        if (!existing) {
          const e: any = new Error('artist not found');
          e.status = 404; e.code = 'NOT_FOUND';
          throw e;
        }
    
        const [updateInfoMeili, updateInfoPrisma] = await generateArtistUpdateInfos(input);
    
        const updated = await prisma.artist.update({
          where: { id },
          data: updateInfoPrisma as any, // ts ile uğraşmamak için
        });
    
        // Update the artist in the meilisearch index
        artistIndex.updateDocuments([{id, ...updateInfoMeili}]);
    
        return { ...updated } as const;
    }

    static softDelete = async function softDelete(id: string) {
      await artistIndex.deleteDocument(id);
      
      await prisma.artist.update({ where: { id }, data: { deletedAt: new Date() } });
    }
}
