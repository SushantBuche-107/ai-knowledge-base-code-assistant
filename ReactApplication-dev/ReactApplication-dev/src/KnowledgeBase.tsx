import React, { useState } from "react";
import "./KnowledgeBase.css";

type SearchResult = {
    id: string;
    score: number;
    metadata: {
        title: string;
        content: string;
        filename?: string;
        download_url?: string;
    };
};

const KnowledgeBase: React.FC = () => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    // ---------------------------
    // 1) Handle file upload
    // ---------------------------
    const handleUpload = async () => {
        if (!title || !content || !file) {
            alert("Title, content, and file are required.");
            return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("content", content);
        formData.append("file", file);

        try {
            const res = await fetch("http://localhost:5000/update_kb", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");
            alert("Knowledge base updated!");
            setTitle("");
            setContent("");
            setFile(null);
        } catch (err) {
            console.error(err);
            alert("Upload error");
        }
    };

    // ---------------------------
    // 2) Handle search
    // ---------------------------
    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setResults([]); // Clear previous results before searching
        try {
            const res = await fetch("http://localhost:5000/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });

            if (!res.ok) throw new Error("Search failed");

            const data: SearchResult[] = await res.json();
            setResults(data);
        } catch (err) {
            console.error(err);
            alert("Search error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f9fafb 0%, #dbeafe 100%)', padding: '2.5rem 0.5rem' }}>
            <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
                {/* Upload Section */}
                <div className="kb-section" style={{ marginBottom: '2.5rem' }}>
                    <h2 className="kb-title">
                        <span style={{ background: '#dbeafe', color: '#2563eb', borderRadius: '9999px', padding: '0.25rem 0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>Admin</span>
                        Upload Knowledge
                    </h2>
                    <form style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={e => { e.preventDefault(); handleUpload(); }}>
                        <div>
                            <label className="kb-label">Title</label>
                            <input
                                type="text"
                                placeholder="Title"
                                value={title}
                                className="kb-input"
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="kb-label">Content/Description</label>
                            <textarea
                                placeholder="Content/Description"
                                value={content}
                                className="kb-textarea"
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="kb-label">Attach File</label>
                            <input
                                type="file"
                                className="kb-input"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                        </div>
                        <div>
                            <button
                                type="submit"
                                className="kb-btn"
                                style={{ width: '100%' }}
                            >
                                Upload
                            </button>
                        </div>
                    </form>
                </div>

                {/* Search Section */}
                <div className="kb-section">
                    <h2 className="kb-title" style={{ color: '#15803d' }}>
                        <span style={{ background: '#bbf7d0', color: '#15803d', borderRadius: '9999px', padding: '0.25rem 0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>User</span>
                        Search Knowledge Base
                    </h2>
                    <form style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} onSubmit={e => { e.preventDefault(); handleSearch(); }}>
                        <input
                            type="text"
                            placeholder="Search for 'stripe integration'"
                            value={query}
                            className="kb-input"
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="kb-btn"
                            style={{ background: '#15803d', minWidth: 120 }}
                        >
                            {loading ? "Searching..." : "Search"}
                        </button>
                    </form>

                    {/* Search Results */}
                    <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {results.length === 0 && !loading && (
                            <div style={{ color: '#9ca3af', textAlign: 'center', fontSize: '0.95rem' }}>No results yet. Try searching for something!</div>
                        )}
                        {(() => {
                            // Filter out duplicate results by id and filename
                            const seen = new Set();
                            return results.filter(res => {
                                const key = res.id + '|' + (res.metadata.filename || '');
                                if (seen.has(key)) return false;
                                seen.add(key);
                                return true;
                            }).map((res) => (
                                <div key={res.id + '-' + (res.metadata.filename || '')} className="kb-result-card">
                                    <h3 className="kb-result-title">
                                        <span style={{ background: '#dbeafe', color: '#2563eb', borderRadius: '0.5rem', padding: '0.1rem 0.5rem', fontSize: '0.85rem', fontWeight: 600, marginRight: 6 }}>{res.metadata.filename || 'Doc'}</span>
                                        {res.metadata.title}
                                    </h3>
                                    <p className="kb-result-content">{res.metadata.content}</p>
                                    {res.metadata.download_url && (
                                        <a
                                            href={res.metadata.download_url}
                                            className="kb-download"
                                            download
                                        >
                                            Download File
                                        </a>
                                    )}
                                    <p className="kb-score">Score: {res.score.toFixed(3)}</p>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KnowledgeBase;
