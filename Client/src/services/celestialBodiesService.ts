import axios from 'axios';

export interface CelestialBodyData {
    name: string;
    mass: number;
    position: [number, number, number];
    velocity: [number, number, number];
}

const API_BASE_URL = 'http://localhost:8001/simulate_n_bodies';

export class CelestialBodiesService {
    private static instance: CelestialBodiesService;
    private constructor() {}

    public static getInstance(): CelestialBodiesService {
        if (!CelestialBodiesService.instance) {
            CelestialBodiesService.instance = new CelestialBodiesService();
        }
        return CelestialBodiesService.instance;
    }

    public async getAllCelestialBodies(): Promise<CelestialBodyData[]> {
        try {
            const response = await axios.get<CelestialBodyData[]>(`${API_BASE_URL}/celestial-bodies`);
            return response.data;
        } catch (error) {
            console.error('Error fetching celestial bodies:', error);
            throw error;
        }
    }

    public async getCelestialBodyByName(name: string): Promise<CelestialBodyData> {
        try {
            const response = await axios.get<CelestialBodyData>(`${API_BASE_URL}/celestial-bodies/${name}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching celestial body ${name}:`, error);
            throw error;
        }
    }

    public async updateCelestialBody(name: string, data: Partial<CelestialBodyData>): Promise<CelestialBodyData> {
        try {
            const response = await axios.put<CelestialBodyData>(`${API_BASE_URL}/celestial-bodies/${name}`, data);
            return response.data;
        } catch (error) {
            console.error(`Error updating celestial body ${name}:`, error);
            throw error;
        }
    }

    public async getBodiesStateAtTime(timestamp: Date): Promise<CelestialBodyData[]> {
        try {
            const response = await axios.get<CelestialBodyData[]>(`${API_BASE_URL}/celestial-bodies/state`, {
                params: {
                    timestamp: timestamp.toISOString()
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching bodies state:', error);
            throw error;
        }
    }
}

export const celestialBodiesService = CelestialBodiesService.getInstance();