import { OrbitData2 } from "./types/Orbit2";
import { Vector3 } from "three";

export function getPositionFromOrbit2(orbit: OrbitData2, simulationTime: number, simulationStartTime: number): Vector3 {
    if (orbit === undefined) {
        return new Vector3(0, 0, 0);
    }

    const timestamps = Object.keys(orbit).map(Number);
    const sortedTimestamps = timestamps.sort((a, b) => a - b);

    // Convert to seconds without flooring
    const currentTime = (simulationTime/1000 - simulationStartTime/1000);
    
    // Find the two timestamps we're between
    let left = 0;
    while (left < sortedTimestamps.length - 1 && sortedTimestamps[left + 1] <= currentTime) {
        left++;
    }
    
    // If we're at the end of the array, wrap around to the beginning
    const right = (left + 1) % sortedTimestamps.length;
    
    // Get the positions at these timestamps
    const leftTimestamp = sortedTimestamps[left];
    const rightTimestamp = sortedTimestamps[right];
    
    // Calculate interpolation factor
    let t = (currentTime - leftTimestamp) / (rightTimestamp - leftTimestamp);
    
    // Handle wrap-around case
    if (right === 0) {
        const period = sortedTimestamps[sortedTimestamps.length - 1] - sortedTimestamps[0];
        t = (currentTime - leftTimestamp) / period;
    }
    
    // Clamp t between 0 and 1 to prevent extrapolation
    t = Math.max(0, Math.min(1, t));

    const position = orbit[leftTimestamp.toFixed(1)];
    const nextPosition = orbit[rightTimestamp.toFixed(1)];

    const interpolatedPosition = new Vector3(
        position[0] + (nextPosition[0] - position[0]) * t,
        position[1] + (nextPosition[1] - position[1]) * t,
        position[2] + (nextPosition[2] - position[2]) * t
    );
    
    return interpolatedPosition;
}

//return the index of the closest timestamp to the current time
function getClosestTimestamp(timestamps: number[], currentTime: number): number {
    let left = 0, right = timestamps.length - 1;
    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (timestamps[mid] === currentTime) {
            return mid;
        } else if (timestamps[mid] < currentTime) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return right;
}