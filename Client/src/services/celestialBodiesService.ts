import axios from 'axios';

export interface CelestialBodyData {
    name: string;
    mass: number;
    position: [number, number, number];
    velocity: [number, number, number];
}

const API_BASE_URL = 'http://localhost:8001';

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
            const response = await axios.get<CelestialBodyData[]>(`${API_BASE_URL}/get_trajectories/`);
            return response.data;
        } catch (error) {
            console.error('Error fetching celestial bodies:', error);
            throw error;
        }
    }

    public async getCelestialBodyByName(name: string): Promise<CelestialBodyData> {
        try {
            const response = await axios.post<CelestialBodyData>(`${API_BASE_URL}/trajectory_between_dates/`, {
                body_name: name,
                start_date: new Date().toISOString().split('T')[0], // Current date
                end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching celestial body ${name}:`, error);
            throw error;
        }
    }

    public async updateCelestialBody(name: string, data: Partial<CelestialBodyData>): Promise<CelestialBodyData> {
        try {
            const response = await axios.post<CelestialBodyData>(`${API_BASE_URL}/maneuver/`, {
                body_name: name,
                delta_velocity: data.velocity || [0, 0, 0],
                simulation_time: null // Current time
            });
            return response.data;
        } catch (error) {
            console.error(`Error updating celestial body ${name}:`, error);
            throw error;
        }
    }

    public async getBodiesStateAtTime(timestamp: Date): Promise<CelestialBodyData[]> {
        try {
            const response = await axios.post<CelestialBodyData[]>(`${API_BASE_URL}/get_trajectories/`, {
                start_date: timestamp.toISOString().split('T')[0],
                end_date: new Date(timestamp.getTime() + 86400000).toISOString().split('T')[0], // One day later
                body_names: [] // You'll need to provide the list of body names you want to track
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching bodies state:', error);
            throw error;
        }
    }
}

export const celestialBodiesService = CelestialBodiesService.getInstance();