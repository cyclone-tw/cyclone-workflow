
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Dimension, Metric
from google.oauth2 import service_account

KEY_FILE_PATH = '/Users/eugene/Downloads/cyclone-tw-bce62776d466.json'
PROPERTY_ID = '532517605'

def test_access():
    print(f"Testing access for Property ID: {PROPERTY_ID}")
    try:
        credentials = service_account.Credentials.from_service_account_file(KEY_FILE_PATH)
        client = BetaAnalyticsDataClient(credentials=credentials)

        request = RunReportRequest(
            property=f"properties/{PROPERTY_ID}",
            dimensions=[Dimension(name="date")],
            metrics=[Metric(name="activeUsers")],
            date_ranges=[DateRange(start_date="7daysAgo", end_date="today")],
        )
        
        response = client.run_report(request)
        print("✅ 成功讀取數據！")
        if not response.rows:
            print("目前沒有數據（Rows 為空），但 API 通道是正常的。")
        else:
            for row in response.rows[:5]:
                print(f"Date: {row.dimension_values[0].value}, Active Users: {row.metric_values[0].value}")

    except Exception as e:
        print(f"❌ 錯誤詳情：\n{e}")

if __name__ == "__main__":
    test_access()
