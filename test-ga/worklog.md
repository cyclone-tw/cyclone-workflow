# Google Analytics 4 (GA4) API 整合工作紀錄 (Worklog)

## 專案資訊
- **Google Cloud Project ID**: `cyclone-tw` (761228748615)
- **服務帳號 (Service Account)**: `cyclone-tw@cyclone-tw.iam.gserviceaccount.com`
- **測試用的 Property ID**: `532517605`
- **金鑰路徑**: `/Users/eugene/Downloads/cyclone-tw-bce62776d466.json`

## 診斷過程與結論
1. **初期問題**：使用者回報 API Viewer 無法使用。
2. **診斷結果**：
   - **Data API**：原本即為啟用狀態，且服務帳號已加入 GA4 權限名單。
   - **Admin API**：初期為**停用**狀態，導致無法自動列出帳戶下的資源 (Properties)。
   - **連通性驗證**：手動指定 Property ID `532517605` 後，Data API 可成功回傳活躍使用者數據。
3. **目前狀態**：Admin API 與 Data API 均已啟用，服務帳號權限已就緒。

---

## 串接指南 (給開發者/AI 參考)

### 1. 環境準備
必須安裝 Google 官方提供的客戶端函式庫：
```bash
pip install google-analytics-data google-analytics-admin google-auth
```

### 2. API 啟用檢查清單
確保在 Google Cloud Console 中啟用了以下 API：
- [Google Analytics Data API](https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview?project=761228748615) (讀取報表數據)
- [Google Analytics Admin API](https://console.developers.google.com/apis/api/analyticsadmin.googleapis.com/overview?project=761228748615) (管理帳戶、列出資源)

### 3. GA4 權限設定
服務帳號必須被加入到 GA4 資源的「資源存取管理」中：
- **位置**：GA4 管理 -> 資源 -> 資源存取管理
- **權限**：建議至少賦予「檢視者 (Viewer)」權限。

### 4. 範例程式碼 (Python)

#### A. 自動列出所有可存取的資源 (需 Admin API)
此步驟用於自動化偵測使用者有哪些 Property。
```python
from google.analytics.admin_v1alpha import AnalyticsAdminServiceClient
from google.oauth2 import service_account

def list_ga4_properties(key_path):
    credentials = service_account.Credentials.from_service_account_file(key_path)
    client = AnalyticsAdminServiceClient(credentials=credentials)
    
    # 遍歷帳戶並列出其下的資源
    for account in client.list_accounts():
        print(f"Account: {account.display_name}")
        properties = client.list_properties(filter=f"parent:{account.name}")
        for prop in properties:
            print(f"  - Property: {prop.display_name} (ID: {prop.name.split('/')[-1]})")

# 使用範例
# list_ga4_properties('/Users/eugene/Downloads/cyclone-tw-bce62776d466.json')
```

#### B. 讀取報表數據 (需 Data API)
這是核心功能，必須提供 `property_id`。
```python
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Dimension, Metric

def get_report(key_path, property_id):
    credentials = service_account.Credentials.from_service_account_file(key_path)
    client = BetaAnalyticsDataClient(credentials=credentials)
    
    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="date")],
        metrics=[Metric(name="activeUsers")],
        date_ranges=[DateRange(start_date="7daysAgo", end_date="today")],
    )
    
    response = client.run_report(request)
    return response

# 使用範例
# res = get_report('path_to_key.json', '532517605')
```

## 注意事項
- **數據延遲**：GA4 API 的數據通常有 24-48 小時的延遲，剛產生的數據可能無法立即透過 API 查到。
- **配額限制**：GA4 API 有每日配額限制，若調用頻率極高需注意 `QuotaExceeded` 錯誤。
- **維度指標名稱**：必須遵循 [GA4 API Schema](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema)，與舊版 UA 不同。
