function setOnline(value) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
}

function loadApi() {
  jest.resetModules();
  return require("./api");
}

describe("api offline mutation queue", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
    setOnline(true);
    global.fetch = jest.fn();
  });

  test("queues mutating requests while offline without calling fetch", async () => {
    setOnline(false);
    const { api, getQueuedMutationCount } = loadApi();
    const eventSpy = jest.fn();
    window.addEventListener("drams:queue-changed", eventSpy);

    const result = await api.createResource({
      name: "Field Kit",
      category: "Medical",
      qty: 1,
      location: "Depot",
    });

    expect(result).toEqual(expect.objectContaining({ queued: true, offline: true }));
    expect(getQueuedMutationCount()).toBe(1);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(eventSpy).toHaveBeenCalled();

    window.removeEventListener("drams:queue-changed", eventSpy);
  });

  test("replays queued mutations and clears successful entries", async () => {
    setOnline(false);
    const { api, replayQueuedMutations, getQueuedMutationCount } = loadApi();
    await api.createResource({
      name: "Water",
      category: "Food",
      qty: 5,
      location: "Depot",
    });
    expect(getQueuedMutationCount()).toBe(1);

    setOnline(true);
    global.fetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 7, name: "Water" }),
    });

    await replayQueuedMutations();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/resources"),
      expect.objectContaining({ method: "POST" })
    );
    expect(getQueuedMutationCount()).toBe(0);
  });

  test("keeps failed replay entries without duplicating them", async () => {
    setOnline(false);
    const { api, replayQueuedMutations, getQueuedMutationCount } = loadApi();
    await api.updateResource(42, { qty: 3 });
    expect(getQueuedMutationCount()).toBe(1);

    setOnline(true);
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "invalid" }),
    });

    await replayQueuedMutations();

    expect(getQueuedMutationCount()).toBe(1);
    const queued = JSON.parse(localStorage.getItem("drams_queued_mutations"));
    expect(queued).toHaveLength(1);
    expect(queued[0].path).toBe("/api/resources/42");
  });
});
