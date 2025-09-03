import requests
import time
from fake_useragent import UserAgent
url = "https://www.sih.gov.in/"


session = requests.Session()

ua = UserAgent()
headers = {'User-Agent': ua.random,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.google.com/'
           }

response = session.get(url, headers=headers)


with open("sih.html", "w", encoding='utf-8') as f:
    f.write(response.text)
print("HTML content saved to sih.html")