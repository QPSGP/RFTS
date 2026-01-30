"use client";

import { useEffect, useMemo, useState } from "react";

type Interest = {
  id: string;
  name: string;
  description?: string;
};

type LibraryItem = {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  audioUrl: string;
  interestIds: string[];
  order: number;
};

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

export default function AdminContent() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    const [interestRes, libraryRes] = await Promise.all([
      fetch("/api/interests"),
      fetch("/api/library")
    ]);
    if (!interestRes.ok || !libraryRes.ok) {
      setStatus("Admin session required.");
      return;
    }
    const interestData = await interestRes.json();
    const libraryData = await libraryRes.json();
    setInterests(interestData.interests || []);
    setLibrary(
      (libraryData.library || []).sort(
        (a: LibraryItem, b: LibraryItem) => a.order - b.order
      )
    );
  };

  useEffect(() => {
    load();
  }, []);

  const interestOptions = useMemo(() => {
    return interests.map((interest) => ({
      value: interest.id,
      label: interest.name
    }));
  }, [interests]);

  const addInterest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      description: formData.get("description")
    };
    const response = await fetch("/api/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      event.currentTarget.reset();
      await load();
    }
  };

  const deleteInterest = async (id: string) => {
    await fetch("/api/interests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    await load();
  };

  const addLibraryItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const interestIds = formData.getAll("interestIds") as string[];
    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      coverUrl: formData.get("coverUrl"),
      audioUrl: formData.get("audioUrl"),
      interestIds
    };
    const response = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      event.currentTarget.reset();
      await load();
    }
  };

  const moveItem = async (id: string, direction: "up" | "down") => {
    const index = library.findIndex((item) => item.id === id);
    if (index === -1) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= library.length) {
      return;
    }
    const reordered = [...library];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setLibrary(reordered);
    await fetch("/api/library", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((item) => item.id) })
    });
    await load();
  };

  return (
    <div className="grid" style={{ gap: 24 }}>
      {status && <p>{status}</p>}
      <div className="card">
        <h2>Interests</h2>
        <form onSubmit={addInterest} className="grid">
          <input name="name" placeholder="Interest name" required style={inputStyle} />
          <input
            name="description"
            placeholder="Short description"
            style={inputStyle}
          />
          <button className="button" type="submit">
            Add Interest
          </button>
        </form>
        <div className="grid" style={{ marginTop: 16 }}>
          {interests.map((interest) => (
            <div key={interest.id} className="card">
              <strong>{interest.name}</strong>
              <p>{interest.description}</p>
              <button
                className="button button-secondary"
                onClick={() => deleteInterest(interest.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Audio Library</h2>
        <form onSubmit={addLibraryItem} className="grid">
          <input name="title" placeholder="Title" required style={inputStyle} />
          <input
            name="description"
            placeholder="Description"
            required
            style={inputStyle}
          />
          <input name="coverUrl" placeholder="Cover URL" required style={inputStyle} />
          <input name="audioUrl" placeholder="Audio URL" required style={inputStyle} />
          <label style={{ fontSize: 13 }}>Attach interests</label>
          <select name="interestIds" multiple style={inputStyle}>
            {interestOptions.map((interest) => (
              <option key={interest.value} value={interest.value}>
                {interest.label}
              </option>
            ))}
          </select>
          <button className="button" type="submit">
            Add Audio
          </button>
        </form>
        <div className="grid" style={{ marginTop: 16 }}>
          {library.map((item) => (
            <div key={item.id} className="card">
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <p>Cover: {item.coverUrl}</p>
              <p>Audio: {item.audioUrl}</p>
              <p>Interests: {item.interestIds.join(", ") || "None"}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="button button-secondary"
                  onClick={() => moveItem(item.id, "up")}
                >
                  Move Up
                </button>
                <button
                  className="button button-secondary"
                  onClick={() => moveItem(item.id, "down")}
                >
                  Move Down
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
