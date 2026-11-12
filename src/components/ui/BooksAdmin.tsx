import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
interface Book {
  id: string;
  title: string;
  iconUrl: string;
  iconPath: string;
  pageUrls: string[];
  pagePaths: string[];
  isPremium: boolean;
  isActive: boolean;
  order: number;
}

const naturalSort = (a: File, b: File) =>
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });

const extensionOf = (file: File) => {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "jpg";
};

const styles = {
  page: { padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 980, margin: "0 auto" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 24 },
  row: { display: "flex", gap: 16, flexWrap: "wrap" as const, alignItems: "center", marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#334155" },
  input: { padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14 },
  button: { padding: "9px 16px", border: "none", borderRadius: 8, background: "#0284c7", color: "#fff", fontWeight: 600, cursor: "pointer" },
  ghost: { padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 13 },
  danger: { padding: "6px 10px", border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", cursor: "pointer", fontSize: 13 },
  thumb: { width: 96, height: 72, objectFit: "cover" as const, borderRadius: 6, border: "1px solid #e2e8f0" },
};

export default function BooksAdmin() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState(1);
  const [isPremium, setIsPremium] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [pageFiles, setPageFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "books"));
      const list: Book[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? "",
          iconUrl: data.iconUrl ?? "",
          iconPath: data.iconPath ?? "",
          pageUrls: data.pageUrls ?? [],
          pagePaths: data.pagePaths ?? [],
          isPremium: data.isPremium ?? false,
          isActive: data.isActive ?? true,
          order: data.order ?? 0,
        };
      });
      list.sort((a, b) => a.order - b.order);
      setBooks(list);
      setOrder(list.length > 0 ? list[list.length - 1].order + 1 : 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load books");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handlePagesSelected = (files: FileList | null) => {
    if (!files) return;
    setPageFiles(Array.from(files).sort(naturalSort));
  };

  const movePage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pageFiles.length) return;
    const next = [...pageFiles];
    [next[index], next[target]] = [next[target], next[index]];
    setPageFiles(next);
  };

  const removePage = (index: number) => {
    setPageFiles(pageFiles.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTitle("");
    setIsPremium(false);
    setIconFile(null);
    setPageFiles([]);
    setProgress("");
  };

  const handleSave = async () => {
    setError("");
    if (!title.trim()) return setError("Enter a book name");
    if (!iconFile) return setError("Choose a book icon");
    if (pageFiles.length === 0) return setError("Choose the page images");

    setSaving(true);
    try {
      const bookRef = doc(collection(db, "books"));
      const bookId = bookRef.id;

      setProgress("Uploading icon...");
      const iconPath = `books/${bookId}/icon.${extensionOf(iconFile)}`;
      await uploadBytes(ref(storage, iconPath), iconFile);
      const iconUrl = await getDownloadURL(ref(storage, iconPath));

      const pagePaths: string[] = [];
      const pageUrls: string[] = [];
      for (let i = 0; i < pageFiles.length; i++) {
        setProgress(`Uploading page ${i + 1} of ${pageFiles.length}...`);
        const number = String(i + 1).padStart(3, "0");
        const path = `books/${bookId}/page_${number}.${extensionOf(pageFiles[i])}`;
        await uploadBytes(ref(storage, path), pageFiles[i]);
        pagePaths.push(path);
        pageUrls.push(await getDownloadURL(ref(storage, path)));
      }

      setProgress("Saving book...");
      await setDoc(bookRef, {
        title: title.trim(),
        iconUrl,
        iconPath,
        pageUrls,
        pagePaths,
        pageCount: pageUrls.length,
        isPremium,
        isActive: true,
        order,
        createdAt: serverTimestamp(),
      });

      resetForm();
      await loadBooks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSaving(false);
      setProgress("");
    }
  };

  const updateField = async (book: Book, fields: Partial<Book>) => {
    try {
      await updateDoc(doc(db, "books", book.id), fields);
      setBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, ...fields } : b)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleDelete = async (book: Book) => {
    if (!window.confirm(`Delete "${book.title}" and all its pages?`)) return;
    try {
      const paths = [book.iconPath, ...book.pagePaths].filter(Boolean);
      await Promise.all(
        paths.map((p) => deleteObject(ref(storage, p)).catch(() => undefined))
      );
      await deleteDoc(doc(db, "books", book.id));
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={{ marginBottom: 20 }}>Books</h1>

      {error && (
        <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Add a book</h2>

        <div style={styles.row}>
          <div>
            <label style={styles.label}>Book name</label>
            <input
              style={{ ...styles.input, width: 260 }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label style={styles.label}>Order</label>
            <input
              type="number"
              style={{ ...styles.input, width: 80 }}
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              disabled={saving}
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20 }}>
            <input
              type="checkbox"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
              disabled={saving}
            />
            Premium
          </label>
        </div>

        <div style={styles.row}>
          <div>
            <label style={styles.label}>Book icon (cover shown on the shelf)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setIconFile(e.target.files?.[0] ?? null)}
              disabled={saving}
            />
          </div>
          {iconFile && <img src={URL.createObjectURL(iconFile)} alt="icon" style={styles.thumb} />}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={styles.label}>Pages (select all JPG pages at once, sorted by file number)</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => handlePagesSelected(e.target.files)}
            disabled={saving}
          />
        </div>

        {pageFiles.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
            {pageFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
                <img src={URL.createObjectURL(file)} alt={file.name} style={{ ...styles.thumb, width: "100%", height: 90 }} />
                <div style={{ fontSize: 12, margin: "6px 0", fontWeight: 600 }}>Page {index + 1}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button style={styles.ghost} onClick={() => movePage(index, -1)} disabled={saving || index === 0}>
                    ←
                  </button>
                  <button style={styles.ghost} onClick={() => movePage(index, 1)} disabled={saving || index === pageFiles.length - 1}>
                    →
                  </button>
                  <button style={styles.danger} onClick={() => removePage(index)} disabled={saving}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button style={{ ...styles.button, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? "Uploading..." : "Save book"}
          </button>
          {progress && <span style={{ fontSize: 14, color: "#475569" }}>{progress}</span>}
        </div>
      </div>

      <h2>All books</h2>
      {loading ? (
        <p>Loading...</p>
      ) : books.length === 0 ? (
        <p>No books yet.</p>
      ) : (
        books.map((book) => (
          <div key={book.id} style={{ ...styles.card, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <img src={book.iconUrl} alt={book.title} style={{ ...styles.thumb, width: 120, height: 90 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{book.title}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{book.pageUrls.length} pages</div>
            </div>
            <div>
              <label style={styles.label}>Order</label>
              <input
                type="number"
                style={{ ...styles.input, width: 70 }}
                defaultValue={book.order}
                onBlur={(e) => {
                  const value = Number(e.target.value);
                  if (value !== book.order) updateField(book, { order: value });
                }}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={book.isActive}
                onChange={(e) => updateField(book, { isActive: e.target.checked })}
              />
              Visible
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={book.isPremium}
                onChange={(e) => updateField(book, { isPremium: e.target.checked })}
              />
              Premium
            </label>
            <button style={styles.danger} onClick={() => handleDelete(book)}>
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}
