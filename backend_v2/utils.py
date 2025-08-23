"""
Utilities and helper functions for the API
"""
import numpy as np
import pandas as pd


def optimize_telemetry_data(telemetry_df, max_points=200):
    """
    Optimize telemetry data by reducing points while preserving important features
    
    Args:
        telemetry_df: DataFrame with telemetry data
        max_points: Maximum number of points to keep
    
    Returns:
        Optimized DataFrame
    """
    # If already small enough, return as is
    if len(telemetry_df) <= max_points:
        return telemetry_df
    
    # Calculate required sampling rate
    sampling_rate = len(telemetry_df) // max_points
    
    # Use a smarter sampling approach to preserve important points
    # like speed changes, braking points, etc.
    
    # First identify important points (where values change significantly)
    telemetry_df['speed_change'] = np.abs(telemetry_df['Speed'].diff())
    telemetry_df['throttle_change'] = np.abs(telemetry_df['Throttle'].diff())
    telemetry_df['brake_change'] = np.abs(telemetry_df['Brake'].diff())
    
    # Calculate importance score
    telemetry_df['importance'] = (
        telemetry_df['speed_change'] + 
        10 * telemetry_df['throttle_change'] + 
        20 * telemetry_df['brake_change']
    )
    
    # Sort by importance and take top points
    important_points = telemetry_df.nlargest(max_points // 2, 'importance')
    
    # Take evenly spaced points for the rest
    regular_points = telemetry_df.iloc[::sampling_rate * 2].head(max_points // 2)
    
    # Combine and sort by original index
    combined = pd.concat([important_points, regular_points])
    combined = combined.drop_duplicates()
    combined = combined.sort_index()
    
    # Drop the temporary columns
    combined = combined.drop(['speed_change', 'throttle_change', 'brake_change', 'importance'], axis=1)
    
    return combined
