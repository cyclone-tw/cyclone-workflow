import type { EncryptedData } from './crypto';

export interface QAItem {
  id: string;
  title: string;
  author: string;
  authorTag: string;
  createdAt: string;
  encrypted: EncryptedData;
}

export const QA_ITEMS: QAItem[] = [
  {
    "id": "qa-001",
    "title": "如何評估自身需求選擇對應的 Claude 付費方案？",
    "author": "珊迪",
    "authorTag": "#2429",
    "createdAt": "2026-04-07",
    "encrypted": {
      "salt": "1R0fUOHdcDBWsBXR5dNwug==",
      "iv": "gYGdbBSvzMJrgB7L",
      "ciphertext": "nlfFY5s0wMbvHl3QArctuPhYoZ+lJ7c/jnD6n4BhWNuJldqVwjdviG2Hzs6V3maNgXivB2oabLFfbTLohhfCDv+sEEGHNC0DEkbsm7924HpvgcfdHVQpw9x317WSilW0uoAoI4XKIrdwC2givTQ4qE7vLAbONAn/CIpuQPtURg8C1kZmGKAzJtOKu763QsP7At8QkFTHjWNPqF/c0hSv8sm0mIEIo8kEDD5yaUJiLWO+q/tDV7lt/QSECYAXyJYaXXBNFV7nRVa/hcfm1YW2SM9P7XJxRICKxRuuC425p1v++xVrFPJ1GFBx7hTZ22PWDJYpkvQCJ3QxaoZWafL1OCIq/0LIyVd/9vwSU+hKgsj9iIaKksXzfs3lw8PFukmFwxOXoyyL9sOITuqY7gWTr3J3DAt6PwdtbRWl3qwMdk6pJH3dWl0fGyKKJOTDDyteqOXtKM3f4UHlJBhYK6a3Xc47SRlILvuRXSgZmOBtD9XdErshgUQJbl8iYnkVfXAboY33+duJdWtvHkREEprH3TG7fvAMYxvM97LS1FcQD9gD0vy9iV3QawBd7qYFVIjm8BRGz4ogZeJS0qWrmIazQxKBoAk1IAkOHLc0VzG/N5U="
    }
  },
  {
    "id": "qa-002",
    "title": "這個團是否要做一個 vibe coding 出來的 web page 做入口？",
    "author": "Benson",
    "authorTag": "#2808",
    "createdAt": "2026-04-07",
    "encrypted": {
      "salt": "jXZGG5SHaDKWTUgHrbrClg==",
      "iv": "c8lV2AUgPVmBc8Em",
      "ciphertext": "7nkYhuhbYj0/0rOvneZ7Uvu0PnGHeJXq7ZXW5b7bTE293e+thWY6KwhNYH+MZYdrWRO1PpCiO/v0aqo1848jX1nsHdJTd3M21NGc4RyQlmskux2RxzUfX9NWvRbWldbk0Zj21v9OkYjTa2ohbirY+kSS3zdDtwFmy9Rpg7q4BXRQHXchmYu9jN05TDbz4xSyHoaWyEAlqoSF1gytN6nM1c70gb7eLnTqIcU019DBZIO7Vq7pBMXoQI1T9RZjOi0v/APZGPBOUO9W48VAc+PEcurfed+Cv5qnfQD8wBbqzOWaqfnfzXHL/gWt685ByOszo2PzE5NPhHwXopnucYjx5pPuoJ+Bgv4ZYh5xnyiNNAWHyT3YBAx05pKU6y//qNawpq4HgBtYyLqmLbK46JgnWx6X9go805Gd2K80d7jh/Vs/baZzVakSVEcOzujerouRQgnwwZw6Pklsam9MGCDG5daSyfha4BoOMtwJzfzHE6D/oPZXa6t0M3wQUvNNkDlQDWpqAZHnXxEuwJMvgMi/OcfhfBS1qPLwRDy7RfsvbS1iLMBYpqc="
    }
  },
  {
    "id": "qa-003",
    "title": "什麼是 Agent Memory？為什麼共學團需要它？",
    "author": "Cyclone",
    "authorTag": "#2707",
    "createdAt": "2026-04-07",
    "encrypted": {
      "salt": "SC1vcDjM4fevMpKAqKNQMw==",
      "iv": "B3mruP9f5mSfrZq5",
      "ciphertext": "4dgK5dLBqO8p0OLtL4RKlrk1Wnp3vAapPsMeYmDD0JlJoEgVl8O3dtwKLyf/l0iV0OuS3DPxkq7MpbR858NZGCrl1Ud4ae0BtrUeOnBhDp1qRA/i/a8/UTBio4IM5ai+wyfcChu4ObDjYuc5vllv2wcvNMjMb5KiID8in3DlPyWD1nlJdvxyUb8OrJZLpNWUtlk4l/3UnOLv9XS2QxuPpjWzMaA+pntq0OGmNIYmVNYmVU2GKdqJVTzHCe0mhdomUEVZVKfjLm/7P90OaNrxqNn8kl3P3F2uQny/m4PNcFPSsJsYZyLk90DUNCoYKxQRvkUxR1TPuDIm7ifqFRnshdteeqiW3n3/7SAs5ntVa+3DS0EfimI+mETd+6jQVKA7KN7/5W3DjVdFwEFWieR3BU4aB1mi/iw+mwn6tMqzrlju1lK3FO6CLa15WEJW/BctxXTaxtPYiSmhKWSYLCf4SuuQYWYWkEArWfo0WJFTpw3xEYVJ0tx68QI4rYMx+PSGR6m4+kQFD6EjdcSeU+fyazPb57YRR3Sjw5wk4a6B5ORD1dvS/XE5PQTV58Vprf9QvNBBvIHegCZuEUIvEpDrJIb0Wy04rq7M+rvVnlJLrI4uVDoHIsQiZWDqZHyJuASs/jI7w0qHvStAdilsEVJA86qz1RFTqG9i6fEZpzX9E3ZA3wyAlMXs6hi3c0QCbS6HPE+rFyBs4gCZMRxowBoabGplvjIjH9bNgw=="
    }
  }
];
