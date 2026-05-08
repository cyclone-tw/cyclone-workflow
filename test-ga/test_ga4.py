
import os
from google.analytics.admin_v1alpha import AnalyticsAdminServiceClient
from google.oauth2 import service_account

KEY_FILE_PATH = '/Users/eugene/Downloads/cyclone-tw-bce62776d466.json'

def list_properties():
    try:
        # Load credentials
        credentials = service_account.Credentials.from_service_account_file(KEY_FILE_PATH)
        client = AnalyticsAdminServiceClient(credentials=credentials)

        print(f"Checking access for service account: {credentials.service_account_email}")
        
        # List accounts
        accounts = client.list_accounts()
        account_list = list(accounts)
        
        if not account_list:
            print("No accounts found. The service account might not have been added to any GA4 properties.")
            return

        for account in account_list:
            print(f"Account: {account.display_name} ({account.name})")
            
            # List properties for each account
            properties = client.list_properties(filter=f"parent:{account.name}")
            for property_obj in properties:
                print(f"  - Property: {property_obj.display_name} ({property_obj.name})")
                print(f"    Industry: {property_obj.industry_category}")
                print(f"    Timezone: {property_obj.time_zone}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    list_properties()
