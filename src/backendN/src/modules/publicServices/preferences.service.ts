import { P } from "@faker-js/faker/dist/airline-CLphikKp";
import { prisma } from "../../lib/prisma";

interface Preference {
        keyword: string;
        rating: number;
}

type Preferences = Preference[];

function addPrefs(initial: Preferences, toAdd: string[]) {
    for (const pref of toAdd) {
        const existingPref = initial.find(p => p.keyword === pref);
        if (existingPref) {
            existingPref.rating++;
        } else if (initial.length < 50) {
            initial.push({ keyword: pref, rating: 1 });
        } else {
            const lastPref = initial.sort((a, b) => b.rating - a.rating)[0];
            lastPref.keyword = pref;
            lastPref.rating++;
        }
    }
}

function normalizePrefs(prefs: Preferences) {
    const lowestRating = Math.min(...prefs.map(p => p.rating));
    if (lowestRating > 1) {
        for (const pref of prefs) {
            pref.rating -= lowestRating - 1;
        }
    }
}

export class PreferencesService {
    
    static async addPreferences(userId: string, preferences: string | string[] | undefined) {
        
    if (preferences === undefined) {
        return;
    }

    const prefsToAdd = Array.isArray(preferences) ? preferences : preferences.split(' ');

    const currentPreferences = await this.getPreferences(userId);

    addPrefs(currentPreferences, prefsToAdd);

    // sort by rating descending
    const sortedPreferences = [...currentPreferences].sort((a, b) => b.rating - a.rating);

    try {
        return prisma.user.update({
            where: { id: userId, deletedAt: null },
            data: { preferences: sortedPreferences as any},
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            const err: any = new Error('user not found');
            err.status = 404;
            err.code = 'USER_NOT_FOUND';
            throw err;
        }
        throw error;
    }
}


    static async getPreferences(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } });

        const preferences = (user?.preferences as unknown as Preferences) || [];

        return preferences || [];
    }
    
}