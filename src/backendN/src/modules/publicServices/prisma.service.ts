import { prisma } from "../../lib/prisma";

export class PrismaService {
    static getEventsFromIds = async function getEventsFromIds(ids: string[], limit = 12, page = 1) {

        const data = await prisma.event.findMany({
            where: {
            id: {
                in: ids,
            },
            },
            take: limit,
            select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            startDate: true,
            endDate: true,
            venue: true,
            address: true,
            city: true,
            banner: true,
            description: true,
            status: true,
            organizerId: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            },
        })

        const dataById = new Map(data.map(d => [d.id, d]))
        const ordered = (ids as string[]).map(id => dataById.get(id));

        return ordered;
    }

    static getArtistsFromIds = async function getArtistsFromIds(ids: string[], limit = 12, page = 1) {

        const data = await prisma.artist.findMany({
            where: {
            id: {
                    in: ids,
                },
            },
            take: limit,
            select: {
            id: true,
            name: true,
            slug: true,
            genres: true,
            banner: true,
            socialMedia: true,
            bio: true,
            approved: true,
            favoriteCount: true,
            deletedAt: true,
            },
        })

        const dataById = new Map(data.map(d => [d.id, d]))
        const ordered = (ids as string[]).map(id => dataById.get(id));

        return ordered;
    }

    static getVenuesFromIds = async function getVenuesFromIds(ids: string[], limit = 12, page = 1) {

        const data = await prisma.venue.findMany({
            where: {
            id: {
                in: ids,
            },
            },
            take: limit,
            select: {
            id: true,
            name: true,
            slug: true,
            banner: true,
            details: true,
            capacity: true,
            seatedCapacity: true,
            standingCapacity: true,
            accessibility: true,
            address: true,
            city: true,
            latitude: true,
            longitude: true,
            mapsLocation: true,
            approved: true,
            favoriteCount: true,
            deletedAt: true,
            events: {
                select: {
                        id: true,
                    },
                },
            },
        })

        const dataById = new Map(data.map(d => [d.id, d]))
        const ordered = (ids as string[]).map(id => dataById.get(id));

        return ordered;
    }

    static getOrganizersFromIds = async function getOrganizersFromIds(ids: string[], limit = 12, page = 1) {

        const data = await prisma.organizer.findMany({
            where: {
            id: {
                in: ids,
            },
            },
            take: limit,
            select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            avatar: true,
            approved: true,
            events: {
                select: {
                    id: true
                    },
                },
            deletedAt: true,
            },
        })

        const dataById = new Map(data.map(d => [d.id, d]))
        const ordered = (ids as string[]).map(id => dataById.get(id));

        return ordered;
    }
}
