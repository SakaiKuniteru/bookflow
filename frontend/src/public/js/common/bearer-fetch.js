(() => {
  const tokenElement = document.querySelector('meta[name="bf-access-token"]');
  let accessToken = tokenElement?.content || "";
  tokenElement?.remove();
  const channel =
    typeof BroadcastChannel === "function"
      ? new BroadcastChannel("bookflow-access-token")
      : null;
  channel?.addEventListener("message", (event) => {
    if (typeof event.data?.token === "string") accessToken = event.data.token;
  });
  const capNhatToken = (token) => {
    accessToken = typeof token === "string" ? token : "";
    channel?.postMessage({ token: accessToken });
  };
  window.BookFlowAuth = {
    setAccessToken: capNhatToken,
    clearAccessToken: () => capNhatToken(""),
  };
  const nativeFetch = window.fetch.bind(window);
  const activeLoadingRequests =
    window.__bfActiveLoadingRequests instanceof Map
      ? window.__bfActiveLoadingRequests
      : new Map();
  window.__bfActiveLoadingRequests = activeLoadingRequests;
  let loadingSequence = 0;
  const getLoadingMessage = (method, pathname) => {
    if (pathname.endsWith("/nhan-vien/kiem-tra-tao-moi"))
      return "Đang kiểm tra thông tin nhân viên...";
    if (
      pathname.endsWith("/khach-hang/kiem-tra-tao-moi") ||
      pathname.endsWith("/kiem-tra")
    )
      return "Đang kiểm tra thông tin khách hàng...";
    if (pathname.includes("/reset-mat-khau"))
      return "Đang gửi mật khẩu mới qua email...";
    if (pathname.endsWith("/quay-lai-lam"))
      return "Đang cập nhật nhân viên và gửi mật khẩu...";
    if (method === "GET") return "Đang tải dữ liệu...";
    if (method === "POST") return "Đang tạo dữ liệu...";
    if (method === "PUT" || method === "PATCH")
      return "Đang cập nhật dữ liệu...";
    if (method === "DELETE") return "Đang xóa dữ liệu...";
    return "Đang xử lý...";
  };
  const emitLoading = (type, request) =>
    window.dispatchEvent(
      new CustomEvent("bookflow:api-loading", { detail: { type, ...request } }),
    );
  window.fetch = (input, init = {}) => {
    const options = init || {};
    const requestUrl =
      input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.href
          : String(input);
    let url;
    try {
      url = new URL(requestUrl, window.location.href);
    } catch {
      return nativeFetch(input, options);
    }
    const isApiRequest = /^\/api(?:\/|$)/.test(url.pathname);
    const isDataJsonRequest = /^\/data\/.*\.json$/i.test(url.pathname);
    if (
      url.origin !== window.location.origin ||
      (!isApiRequest && !isDataJsonRequest)
    )
      return nativeFetch(input, options);
    const headers = new Headers(
      input instanceof Request ? input.headers : undefined,
    );
    new Headers(options.headers || {}).forEach((value, name) =>
      headers.set(name, value),
    );
    if (isApiRequest && accessToken)
      headers.set("Authorization", `Bearer ${accessToken}`);
    const requestOptions = { ...options, headers };
    const method = String(
      options.method || (input instanceof Request ? input.method : "GET"),
    ).toUpperCase();
    const loadingRequest =
      url.pathname === "/api/xac-thuc/hoat-dong"
        ? null
        : {
            id: `bf-${Date.now()}-${++loadingSequence}`,
            text: getLoadingMessage(method, url.pathname),
          };
    if (loadingRequest) {
      activeLoadingRequests.set(loadingRequest.id, loadingRequest);
      emitLoading("start", loadingRequest);
    }
    const requestInput =
      input instanceof Request ? new Request(url.href, input) : url.href;
    return nativeFetch(requestInput, requestOptions)
      .then((response) => {
        const tokenMoi = response.headers.get("X-BookFlow-Access-Token");
        if (tokenMoi) capNhatToken(tokenMoi);
        return response;
      })
      .finally(() => {
        if (!loadingRequest) return;
        activeLoadingRequests.delete(loadingRequest.id);
        emitLoading("end", loadingRequest);
      });
  };
})();
