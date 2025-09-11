import { Request } from "express";
import { CreateVenueInput, UpdateVenueInput } from "./venues.dto";
import { prisma } from "../../lib/prisma";
import { venueIndex } from "../../lib/meili";
import { generateEventCreateInfos, generateVenueCreateInfos, generateVenueUpdateInfos } from "../publicServices/createInfo.service";
import { SearchService } from "../search/search.service";

export class VenuesService {
  static list = async function list(query: any) {
    const val = await SearchService.searchVenue(query);
    return val
  }

    static async findById(id: string) {
        const venue = await prisma.venue.findFirst({ 
          where: { 
            id, deletedAt: null 
          },
          include: {
            favoriteUsers: {
              select: {
                userId: true,
              },
            },
          } 
        });
        if (!venue) {
          const e: any = new Error('venue not found');
          e.status = 404; e.code = 'NOT_FOUND';
          throw e;
        }
        return venue;
      }
    
      static async findBySlug(slug: string) {
        console.log(slug);
        const venue = await prisma.venue.findFirst({ 
          where: {
             slug,
            deletedAt: null 
            },
            include: {
              events: {
                select: {
                  id: true
                }
              },
              favoriteUsers: {
                select: {
                  userId: true,
                },
              },
            } 
        });
        if (!venue) {
          const e: any = new Error('venue not found');
          e.status = 404; e.code = 'NOT_FOUND';
          throw e;
        }
        return venue;
      }

    static create = async function create(input: CreateVenueInput) {
      
    
      const [createInfoMeili, createInfoPrisma] = await generateVenueCreateInfos(input);
  
      const created = await prisma.venue.create({
        data: createInfoPrisma as any, // ts ile uğraşmamak için
      });
  
      // Add the venue to the meilisearch index
      if (venueIndex) {
        venueIndex.addDocuments([{id: created.id, ...createInfoMeili}]);
      }
      
      return created;
    }      

    static update = async function update(id: string, input: UpdateVenueInput) {
      const existing = await prisma.venue.findFirst({ where: { id, deletedAt: null } });
        if (!existing) {
          const e: any = new Error('venue not found');
          e.status = 404; e.code = 'NOT_FOUND';
          throw e;
        }
    
        const [updateInfoMeili, updateInfoPrisma] = await generateVenueUpdateInfos(input);
    
        const updated = await prisma.venue.update({
          where: { id },
          data: updateInfoPrisma as any, // ts ile uğraşmamak için
        });
    
        // Update the event in the meilisearch index
        if (venueIndex) {
          venueIndex.updateDocuments([{id, ...updateInfoMeili}]);
        }
    
        return { ...updated } as const;
    }

    static softDelete = async function softDelete(id: string) {
      if (venueIndex) {
        await venueIndex.deleteDocument(id);
      }
      
      await prisma.venue.update({ where: { id }, data: { deletedAt: new Date() } });
    }

    static async sendFollowRequest(venueId: string, userId: string) {
        return prisma.favoriteVenue.create({ data: { userId, venueId } });
      }
    
      static async cancelFollowRequest(venueId: string, userId: string) {
        return prisma.favoriteVenue.delete({ where: { userId_venueId: { userId, venueId } } });
      }
}