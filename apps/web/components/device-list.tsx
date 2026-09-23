"use client";

import { useCallback, useEffect, useState } from "react";

import { API_URL } from "@/lib/auth-client";

type Device = { id: string; name: string | null; createdAt: string; lastUsedAt: string | null };

export function DeviceList() {
  const [devices, setDevices] = useState<Device[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/desktop/devices`, { credentials: "include" });
    setDevices(res.ok ? await res.json() : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function revoke(id: string) {
    await fetch(`${API_URL}/api/desktop/devices/${id}`, { method: "DELETE", credentials: "include" });
    void load();
  }

  if (!devices) return <p className="text-sm text-neutral-500">Loading...</p>;
  if (devices.length === 0) return <p className="text-sm text-neutral-500">No desktop apps signed in.</p>;

  return (
    <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {devices.map((device) => (
        <li key={device.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-medium">{device.name ?? "Desktop app"}</p>
            <p className="text-xs text-neutral-500">
              Signed in {new Date(device.createdAt).toLocaleString()}
              {device.lastUsedAt && ` · last used ${new Date(device.lastUsedAt).toLocaleString()}`}
            </p>
          </div>
          <button onClick={() => revoke(device.id)} className="text-sm text-red-600 hover:underline">
            Sign out
          </button>
        </li>
      ))}
    </ul>
  );
}
