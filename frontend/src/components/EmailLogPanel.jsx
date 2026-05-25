import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { format } from 'date-fns';

const EmailLogPanel = ({ jobId, isVisible }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchLogs();
    }
  }, [isVisible, jobId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/applications/admin/jobs/${jobId}/email-log/`);
      setLogs(response.data);
    } catch (err) {
      console.error("Failed to fetch email logs", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="font-bold text-gray-800 flex items-center">
          <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          Email History
          <span className="ml-2 bg-gray-200 text-gray-700 py-0.5 px-2 rounded-full text-xs">{logs.length}</span>
        </h3>
        <button onClick={fetchLogs} className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
          Refresh
        </button>
      </div>

      <div className="p-6">
        {loading && <div className="text-gray-500 py-4 text-center">Loading logs...</div>}
        {!loading && logs.length === 0 && <div className="text-gray-500 py-4 text-center">No emails have been sent for this job yet.</div>}

        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${log.status === 'sent' ? 'bg-green-100 text-green-800' : log.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {log.status.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{log.resumes_attached} resumes attached</span>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  <div>{format(new Date(log.sent_at), 'MMM dd, yyyy h:mm a')}</div>
                  <div>by {log.sent_by_name}</div>
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-2">
                <div><strong>To:</strong> {log.company_email}</div>
                {log.cc_emails && log.cc_emails.length > 0 && <div><strong>CC:</strong> {log.cc_emails.join(', ')}</div>}
                <div className="mt-1"><strong>Subject:</strong> {log.subject}</div>
              </div>

              <details className="text-sm mt-3">
                <summary className="text-blue-600 hover:text-blue-800 cursor-pointer outline-none">Show details</summary>
                <div className="mt-3 bg-white p-3 border border-gray-200 rounded text-gray-700 whitespace-pre-wrap font-mono text-xs">
                  {log.body}
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  <strong>Students Included:</strong> {log.student_names.join(', ')}
                </div>
                {log.skipped_students && log.skipped_students.length > 0 && (
                  <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 border border-amber-200 rounded">
                    <strong>Skipped:</strong> {log.skipped_students.join(', ')}
                  </div>
                )}
                {log.status === 'failed' && log.error_message && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 border border-red-200 rounded">
                    <strong>Error:</strong> {log.error_message}
                  </div>
                )}
              </details>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmailLogPanel;
