from datetime import datetime
import pytz

# Reference date: January 1st, 2010 00:00:00 UTC
REFERENCE_DATE = datetime(2010, 1, 1, tzinfo=pytz.UTC)

def date_to_seconds(date_str: str) -> float:
    """
    Convert a date string to seconds from the reference date (January 1st, 2010).
    
    Args:
        date_str: Date string in ISO format (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
        
    Returns:
        float: Number of seconds from reference date
        
    Example:
        >>> date_to_seconds("2024-01-01")
        441504000.0  # 14 years * 365.25 days * 24 * 60 * 60
    """
    try:
        # Parse the date string
        if ' ' in date_str:
            # If time is provided
            date = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
        else:
            # If only date is provided
            date = datetime.strptime(date_str, "%Y-%m-%d")
            
        # Make the date timezone-aware
        date = pytz.UTC.localize(date)
        
        # Calculate the difference in seconds
        delta = date - REFERENCE_DATE
        return delta.total_seconds()
        
    except ValueError as e:
        raise ValueError(f"Invalid date format. Please use YYYY-MM-DD or YYYY-MM-DD HH:MM:SS. Error: {str(e)}")

def seconds_to_date(seconds: float) -> str:
    """
    Convert seconds from reference date to a date string.
    
    Args:
        seconds: Number of seconds from reference date
        
    Returns:
        str: Date string in ISO format (YYYY-MM-DD HH:MM:SS)
        
    Example:
        >>> seconds_to_date(441504000.0)
        "2024-01-01 00:00:00"
    """
    date = REFERENCE_DATE + datetime.timedelta(seconds=seconds)
    return date.strftime("%Y-%m-%d %H:%M:%S")

def get_trajectory_between_dates(trajectory_dict: dict, start_date: str, end_date: str) -> dict:
    """
    Get trajectory data between two dates.
    
    Args:
        trajectory_dict: Dictionary containing trajectory data with timestamps as keys
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        
    Returns:
        dict: Trajectory data between the specified dates
    """
    start_seconds = date_to_seconds(start_date)
    end_seconds = date_to_seconds(end_date)
    
    filtered_trajectory = {}
    for timestamp, position in trajectory_dict.items():
        timestamp_float = float(timestamp)
        if start_seconds <= timestamp_float <= end_seconds:
            filtered_trajectory[timestamp] = position
            
    return filtered_trajectory 