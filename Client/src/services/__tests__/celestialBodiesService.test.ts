import axios from 'axios';
import { celestialBodiesService, CelestialBodyData } from '../celestialBodiesService';
import { jest } from '@jest/globals';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockCelestialBodies: CelestialBodyData[] = [
  {
    name: "Sun",
    mass: 1.989e30,
    position: [149600000, 0, 0],
    velocity: [0, 0, 0]
  },
  {
    name: "Earth",
    mass: 5.972e24,
    position: [0, 0, 0],
    velocity: [0, 29.78, 0]
  },
  {
    name: "Moon",
    mass: 7.34767309e22,
    position: [384400, 0, 0],
    velocity: [0, 30.802, 0.05]
  }
];

describe('CelestialBodiesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch all celestial bodies', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockCelestialBodies });

    const result = await celestialBodiesService.getAllCelestialBodies();
    
    expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8001/simulate_n_bodies/celestial-bodies');
    expect(result).toEqual(mockCelestialBodies);
  });

  it('should fetch a single celestial body by name', async () => {
    const mockBody = mockCelestialBodies[0];
    mockedAxios.get.mockResolvedValueOnce({ data: mockBody });

    const result = await celestialBodiesService.getCelestialBodyByName('Sun');
    
    expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8001/simulate_n_bodies/celestial-bodies/Sun');
    expect(result).toEqual(mockBody);
  });

  it('should update a celestial body', async () => {
    const mockBody = mockCelestialBodies[0];
    const updateData = {
      position: [149700000, 0, 0] as [number, number, number],
      velocity: [0, 0.1, 0] as [number, number, number]
    };
    
    mockedAxios.put.mockResolvedValueOnce({ data: { ...mockBody, ...updateData } });

    const result = await celestialBodiesService.updateCelestialBody('Sun', updateData);
    
    expect(mockedAxios.put).toHaveBeenCalledWith(
      'http://localhost:8001/simulate_n_bodies/celestial-bodies/Sun',
      updateData
    );
    expect(result).toEqual({ ...mockBody, ...updateData });
  });

  it('should get bodies state at specific time', async () => {
    const testDate = new Date('2024-03-20T12:00:00Z');
    mockedAxios.get.mockResolvedValueOnce({ data: mockCelestialBodies });

    const result = await celestialBodiesService.getBodiesStateAtTime(testDate);
    
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://localhost:8001/simulate_n_bodies/celestial-bodies/state',
      {
        params: {
          timestamp: testDate.toISOString()
        }
      }
    );
    expect(result).toEqual(mockCelestialBodies);
  });

  it('should handle errors when fetching celestial bodies', async () => {
    const error = new Error('Network error');
    mockedAxios.get.mockRejectedValueOnce(error);

    await expect(celestialBodiesService.getAllCelestialBodies())
      .rejects
      .toThrow(error);
  });
}); 