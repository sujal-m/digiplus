import { useState, useEffect } from 'react';
import { knowledgeAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpen, Upload, Search, FileText, Download, Trash2,
  Folder, Sparkles, CheckCircle, ArrowRight, Loader2, Tag
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function KnowledgeBasePage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('other');
  const [docDescription, setDocDescription] = useState('');
  const [docTags, setDocTags] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data } = await knowledgeAPI.listDocuments({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: searchTerm || undefined,
      });
      setDocuments(data.data.items || []);
    } catch (err) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchResults) {
      fetchDocuments();
    }
  }, [categoryFilter]);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResults(null);
      fetchDocuments();
      return;
    }

    try {
      setSearching(true);
      const { data } = await knowledgeAPI.search({ q: searchTerm });
      setSearchResults(data.data);
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
    fetchDocuments();
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please choose a file to upload');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', docTitle || selectedFile.name);
      formData.append('category', docCategory);
      formData.append('description', docDescription);
      formData.append('tags', docTags);

      await knowledgeAPI.uploadDocument(formData);
      toast.success('Document uploaded and indexed successfully');
      setShowUploadModal(false);
      setSelectedFile(null);
      setDocTitle('');
      setDocDescription('');
      setDocTags('');
      fetchDocuments();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (id) => {
    if (!window.confirm('Delete this document from the knowledge base?')) return;
    try {
      await knowledgeAPI.deleteDocument(id);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (err) {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizational Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-1">
            Central repository for architectural blueprints, meeting summaries, runbooks, and decisions.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
        >
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Unified search across meetings, tasks, decisions, and indexed document contents..."
          className="w-full pl-9 pr-24 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
        />
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {searchResults && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            disabled={searching}
            className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
          </button>
        </div>
      </form>

      {/* Category Pills (when not showing unified search) */}
      {!searchResults && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Documents' },
            { id: 'process', label: 'Processes & Runbooks' },
            { id: 'policy', label: 'Policies' },
            { id: 'meeting-notes', label: 'Meeting Transcripts' },
            { id: 'reference', label: 'Reference & Architecture' },
            { id: 'template', label: 'Templates' },
            { id: 'other', label: 'Other' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Unified Search Results */}
      {searchResults ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">
              Search Results for "{searchResults.query}"
            </h3>
            <button onClick={clearSearch} className="text-xs text-indigo-600 hover:underline">
              Return to All Documents
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Meetings Matches */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 shadow-sm">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Matching Meetings ({searchResults.meetings?.length || 0})
              </h4>
              {searchResults.meetings?.length === 0 ? (
                <p className="text-xs text-gray-400">No meeting matches</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {searchResults.meetings.map(m => (
                    <div key={m._id} className="py-2">
                      <a href={`/meetings/${m._id}`} className="text-xs font-semibold text-gray-900 hover:text-indigo-600 block">
                        {m.title}
                      </a>
                      <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{m.description || m.objective}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tasks Matches */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 shadow-sm">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Matching Tasks ({searchResults.tasks?.length || 0})
              </h4>
              {searchResults.tasks?.length === 0 ? (
                <p className="text-xs text-gray-400">No task matches</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {searchResults.tasks.map(t => (
                    <div key={t._id} className="py-2">
                      <a href={`/tasks/${t._id}`} className="text-xs font-semibold text-gray-900 hover:text-indigo-600 block">
                        {t.title}
                      </a>
                      <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{t.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Decisions Matches */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 shadow-sm">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Matching Decisions ({searchResults.decisions?.length || 0})
              </h4>
              {searchResults.decisions?.length === 0 ? (
                <p className="text-xs text-gray-400">No decision matches</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {searchResults.decisions.map(d => (
                    <div key={d._id} className="py-2">
                      <p className="text-xs font-semibold text-gray-900">{d.title}</p>
                      <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{d.rationale}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents Matches */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 shadow-sm">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Matching Documents ({searchResults.documents?.length || 0})
              </h4>
              {searchResults.documents?.length === 0 ? (
                <p className="text-xs text-gray-400">No document matches</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {searchResults.documents.map(d => (
                    <div key={d._id} className="py-2 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{d.title}</p>
                        <p className="text-[11px] text-gray-500 line-clamp-1">{d.description || d.fileName}</p>
                      </div>
                      <a
                        href={`/api/knowledge/documents/${d._id}/download`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 p-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Regular Document Grid */
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900">No documents in knowledge base</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Upload architecture guides, specifications, runbooks, or past meeting transcripts.
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Upload className="w-4 h-4" /> Upload First Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc._id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {doc.category}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {(doc.fileSize / 1024).toFixed(1)} KB
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{doc.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {doc.description || 'No description added.'}
                    </p>

                    {doc.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {doc.tags.map(t => (
                          <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      Uploaded by {doc.uploadedBy?.name || 'User'}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/knowledge/documents/${doc._id}/download`}
                        title="Download file"
                        className="p-1.5 rounded text-gray-500 hover:text-indigo-600 hover:bg-gray-100 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDeleteDoc(doc._id)}
                        title="Delete document"
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Upload to Knowledge Base</h3>
            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">File (PDF, DOCX, TXT, MD) *</label>
                <input
                  type="file"
                  required
                  onChange={e => setSelectedFile(e.target.files[0])}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Document Title (Optional)</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  placeholder="Defaults to filename"
                  className="w-full text-xs rounded-lg border border-gray-300 p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={docCategory}
                  onChange={e => setDocCategory(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-300 p-2.5"
                >
                  <option value="process">Processes & Runbooks</option>
                  <option value="policy">Policies</option>
                  <option value="meeting-notes">Meeting Notes</option>
                  <option value="reference">Reference & Architecture</option>
                  <option value="template">Templates</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={docDescription}
                  onChange={e => setDocDescription(e.target.value)}
                  placeholder="Brief summary of document purpose..."
                  className="w-full text-xs rounded-lg border border-gray-300 p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={docTags}
                  onChange={e => setDocTags(e.target.value)}
                  placeholder="e.g. runbook, architecture, api"
                  className="w-full text-xs rounded-lg border border-gray-300 p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload & Index
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
