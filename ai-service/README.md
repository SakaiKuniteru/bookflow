# BookFlow AI Service

AI Service là dịch vụ Python độc lập của hệ thống BookFlow, chịu trách nhiệm xử lý các nghiệp vụ AI như trợ lý, tìm kiếm thông minh, gợi ý sách, phân tích dữ liệu, retrieval, embeddings và các tác vụ AI chạy nền.

## 1. Vai trò trong hệ thống

BookFlow sử dụng kiến trúc:

Frontend → Node.js Backend → AI Service → LLM / Embedding / Retrieval

Node.js Backend là lớp điều phối nghiệp vụ chính. AI Service không thay thế Backend và không trực tiếp thực hiện các nghiệp vụ như bán hàng, nhập kho, xuất kho, thanh toán, mượn trả hoặc thay đổi dữ liệu nghiệp vụ.

AI Service tập trung vào:
- Hiểu yêu cầu người dùng.
- Phân loại ý định.
- Xử lý hội thoại.
- Tìm kiếm và retrieval.
- Gợi ý sách.
- Phân tích dữ liệu được Backend cung cấp.
- Xử lý embeddings và dữ liệu phục vụ RAG.
- Các tác vụ AI chạy nền.

## 2. Nguyên tắc

AI Service không tự quyết định quyền truy cập dữ liệu nghiệp vụ. Backend chịu trách nhiệm xác thực người dùng, tenant, quyền và phạm vi dữ liệu trước khi cung cấp context cho AI Service.

AI Service không tự ý thay đổi dữ liệu nghiệp vụ của BookFlow.

AI Service không nên truy cập trực tiếp vào các nghiệp vụ của Backend bằng cách tự xây dựng lại logic nghiệp vụ. Khi cần dữ liệu nghiệp vụ, AI Service sử dụng dữ liệu hoặc context được Backend cung cấp thông qua internal API hoặc cơ chế được hệ thống quy định.

## 3. Cấu trúc

```text
ai-service/
├── pyproject.toml
├── Dockerfile
├── .env.example
├── README.md
│
├── app/
│   ├── __init__.py
│   ├── main.py
│   │
│   ├── core/
│   ├── api/
│   ├── schemas/
│   ├── integrations/
│   ├── providers/
│   ├── services/
│   ├── repositories/
│   ├── queue/
│   ├── workers/
│   └── prompts/