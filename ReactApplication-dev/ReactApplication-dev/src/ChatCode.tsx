import React, { useState } from "react";
import "./KnowledgeBase.css";

const ChatCode: React.FC = () => {
    const [query, setQuery] = useState("");
    const [response, setResponse] = useState<string | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [fileUsed, setFileUsed] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [keyInfo, setKeyInfo] = useState<null | {
        label: string;
        usage: number;
        limit: number | null;
        is_free_tier: boolean;
    }>(null);

    const handleChat = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setError(null);
        setResponse(null);
        setDownloadUrl(null);
        setFileUsed(null);
        setKeyInfo(null);
        try {
            const res = await fetch("http://localhost:5000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });
            if (!res.ok) throw new Error("API error");
            const data = await res.json();
            setResponse(data.response);
            setDownloadUrl(data.download_url);
            setFileUsed(data.file_used);

            // Fetch OpenRouter key info after chat response
            const keyRes = await fetch("http://localhost:5000/openrouter-key-info");
            if (keyRes.ok) {
                const keyData = await keyRes.json();
                if (keyData && keyData.data) {
                    setKeyInfo({
                        label: keyData.data.label,
                        usage: keyData.data.usage,
                        limit: keyData.data.limit,
                        is_free_tier: keyData.data.is_free_tier,
                    });
                }
            }
        } catch {
            setError("Failed to fetch code. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="kb-section" style={{ margin: "2rem auto", maxWidth: 700 }}>
            <h2 className="kb-title" style={{ color: "#7c3aed" }}>
                <span style={{ background: "#ede9fe", color: "#7c3aed", borderRadius: "9999px", padding: "0.25rem 0.75rem", fontSize: "0.95rem", fontWeight: 600 }}>Code Chat</span>
                Ask for Code
            </h2>
            <form
                style={{ display: "flex", gap: 12, marginBottom: 24 }}
                onSubmit={e => {
                    e.preventDefault();
                    handleChat();
                }}
            >
                <input
                    type="text"
                    className="kb-input"
                    style={{ flex: 1 }}
                    placeholder="Ask for code, e.g. 'Give me twilio voice call code'"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                <button type="submit" className="kb-btn" style={{ background: "#7c3aed", minWidth: 120 }}>
                    {loading ? "Loading..." : "Ask"}
                </button>
            </form>
            {error && <div style={{ color: "#dc2626", marginBottom: 16 }}>{error}</div>}
            {response && (
                <div className="kb-result-card" style={{ background: "#f5f3ff" }}>
                    <h3 className="kb-result-title" style={{ color: "#7c3aed" }}>AI Response</h3>
                    <pre style={{ whiteSpace: "pre-wrap", background: "#ede9fe", padding: 16, borderRadius: 8, fontSize: 15, marginBottom: 12, overflowX: "auto" }}>{response}</pre>
                    {fileUsed && (
                        <div className="kb-label" style={{ marginBottom: 8 }}>
                            <b>File Used:</b> {fileUsed}
                        </div>
                    )}
                    {downloadUrl && (
                        <a href={downloadUrl} className="kb-download" download>
                            Download Code File
                        </a>
                    )}
                    {keyInfo && (
                        <div className="kb-label" style={{ marginTop: 16, background: '#ede9fe', padding: 8, borderRadius: 6 }}>
                            <b>Key:</b> {keyInfo.label} <br />
                            <b>Usage:</b> {keyInfo.usage} credits<br />
                            <b>Limit:</b> {keyInfo.limit === null ? 'Unlimited' : keyInfo.limit}<br />
                            <b>Free Tier:</b> {keyInfo.is_free_tier ? 'Yes' : 'No'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatCode;
