
import os
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.oauth2 import service_account

KEY_FILE_PATH = '/Users/eugene/Downloads/cyclone-tw-bce62776d466.json'

def check_data_api():
    try:
        credentials = service_account.Credentials.from_service_account_file(KEY_FILE_PATH)
        client = BetaAnalyticsDataClient(credentials=credentials)

        print(f"Checking Data API for service account: {credentials.service_account_email}")
        
        # We need a property ID to test the Data API properly.
        # But we can try to send a request with a fake property ID just to see the error type.
        # If it's 403 SERVICE_DISABLED, then the Data API is also disabled.
        from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Dimension, Metric

        request = RunReportRequest(
            property=f"properties/0", # Dummy ID
            dimensions=[Dimension(name="city")],
            metrics=[Metric(name="activeUsers")],
            date_ranges=[DateRange(start_date="2020-03-31", end_date="today")],
        )
        
        client.run_report(request)

    except Exception as e:
        error_str = str(e)
        if "SERVICE_DISABLED" in error_str:
            print(f"Data API is ALSO disabled.")
        elif "Permission denied" in error_str or "not found" in error_str:
            print(f"Data API seems to be enabled, but property 0 is not found or accessible.")
        else:
            print(f"Data API error: {e}")

if __name__ == "__main__":
    check_data_api()
