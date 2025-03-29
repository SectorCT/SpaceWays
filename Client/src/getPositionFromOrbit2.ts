import { OrbitData2 } from "./types/Orbit2";
import { Vector3 } from "three";

export function getPositionFromOrbit2(orbit: OrbitData2, simulationTime: number, simulationStartTime: number): Vector3 {
    if (orbit === undefined) {
        return new Vector3(0, 0, 0);
    }

    const timestamps = Object.keys(orbit).map(Number);
    const sortedTimestamps = timestamps.sort((a, b) => a - b);

    const currentTime = (Math.floor(simulationTime/1000) - Math.floor(simulationStartTime/1000));
    const closestTimeStampIndex = getClosestTimestamp(sortedTimestamps, currentTime);
    const closestTimeStamp = sortedTimestamps[closestTimeStampIndex];

    const remainingTime = currentTime - closestTimeStamp;

    const nextTimeStamp = sortedTimestamps[closestTimeStampIndex + 1];
    const timeToNextTimeStamp = nextTimeStamp - closestTimeStamp;

    const t = remainingTime / timeToNextTimeStamp;

    const position = orbit[closestTimeStamp.toFixed(1)]
    const nextPosition = orbit[nextTimeStamp.toFixed(1)]

    const interpolatedPosition = new Vector3(
        position[0] + (nextPosition[0] - position[0]) * t,
        position[1] + (nextPosition[1] - position[1]) * t,
        position[2] + (nextPosition[2] - position[2]) * t
    )
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