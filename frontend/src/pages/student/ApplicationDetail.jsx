import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import RoundPipeline from '../../components/RoundPipeline';
import { Building2, Calendar, MapPin, ExternalLink, ArrowLeft, Check, XCircle, Upload, AlertCircle, Award, CheckCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const handleAccept = async (file) => {
    const loadingToast = toast.loading('Accepting job offer...');
    try {
      const formData = new FormData();
      formData.append('status', 'accepted');
      if (file) {
        formData.append('offer_letter_file', file);
      }
      setUploading(true);
      setUploadError('');
      setUploadSuccess('');
      const response = await axios.patch(`/applications/applications/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setApplication(response.data);
      setUploadSuccess(file ? `Offer accepted and "${file.name}" uploaded successfully.` : 'Offer accepted successfully.');
      toast.success('Offer accepted successfully! 🎉', { id: loadingToast });
    } catch (err) {
      console.error(err);
      setUploadError('Failed to accept offer. Please try again.');
      toast.error('Failed to accept offer.', { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  const handleDecline = async () => {
    if (window.confirm('Are you sure you want to decline this job offer? This action is irreversible.')) {
      const loadingToast = toast.loading('Declining offer...');
      try {
        setUploading(true);
        const response = await axios.patch(`/applications/applications/${id}/`, {
          status: 'rejected'
        });
        setApplication(response.data);
        toast.success('Offer declined successfully.', { id: loadingToast });
      } catch (err) {
        console.error(err);
        toast.error('Failed to decline offer.', { id: loadingToast });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleUploadOfferLetter = async (file) => {
    if (!file) return;
    const loadingToast = toast.loading('Uploading offer letter...');
    try {
      const formData = new FormData();
      formData.append('offer_letter_file', file);
      if (application?.job_type === 'external' && application?.status === 'selected') {
        formData.append('status', 'accepted');
      }
      setUploading(true);
      setUploadError('');
      setUploadSuccess('');
      const response = await axios.patch(`/applications/applications/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setApplication(response.data);
      setUploadSuccess(`Offer letter "${file.name}" uploaded successfully.`);
      toast.success('Offer letter uploaded successfully! 📁', { id: loadingToast });
    } catch (err) {
      console.error(err);
      setUploadError('Failed to upload offer letter.');
      toast.error('Failed to upload offer letter.', { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validExtensions = ['pdf', 'doc', 'docx', 'jpg', 'png'];
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!validExtensions.includes(fileExt)) {
        setUploadError('Invalid file type. Supported formats: PDF, DOC, DOCX, JPG, PNG.');
        setUploadSuccess('');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File is too large. Maximum size is 10MB.');
        setUploadSuccess('');
        return;
      }
      const offCampus = application?.job_type === 'external';
      if (application.status === 'selected' && !offCampus) {
        handleAccept(file);
      } else {
        handleUploadOfferLetter(file);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExtensions = ['pdf', 'doc', 'docx', 'jpg', 'png'];
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!validExtensions.includes(fileExt)) {
        setUploadError('Invalid file type. Supported formats: PDF, DOC, DOCX, JPG, PNG.');
        setUploadSuccess('');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File is too large. Maximum size is 10MB.');
        setUploadSuccess('');
        return;
      }
      const offCampus = application?.job_type === 'external';
      if (application.status === 'selected' && !offCampus) {
        handleAccept(file);
      } else {
        handleUploadOfferLetter(file);
      }
    }
  };


  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const response = await axios.get(`/applications/applications/${id}/`);
        setApplication(response.data);
      } catch (err) {
        setError('Failed to load application details.');
      } finally {
        setLoading(false);
      }
    };
    fetchApplication();
  }, [id]);

  const handleWithdraw = async () => {
    if (window.confirm('Are you sure you want to withdraw your application?')) {
      const loadingToast = toast.loading('Withdrawing application...');
      try {
        await axios.post(`/applications/applications/${id}/withdraw/`);
        toast.success('Application withdrawn successfully', { id: loadingToast });
        navigate('/student/dashboard');
      } catch (err) {
        toast.error('Failed to withdraw application', { id: loadingToast });
      }
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!application) return null;

  const isOffCampus = application.job_type === 'external';

  return (
    <div className="app-detail-container">
      <button onClick={() => navigate(-1)} className="action-link mb-6 flex items-center">
        <ArrowLeft size={16} className="mr-2" /> Back
      </button>

      <div className="app-detail-shell">
        {/* Header */}
        <div className="app-detail-hero">
          <div>
            <h1 className="app-detail-title">{application.job_title}</h1>
            <div className="app-detail-company">
              <Building2 size={20} className="mr-2" />
              {application.company_name}
            </div>
            <div className="app-detail-badges">
              <div className="app-detail-badge">
                Status: <span className="ml-2 uppercase tracking-wide">{application.status}</span>
              </div>
              {isOffCampus && (
                <div className="app-detail-badge off-campus">
                  Off-Campus
                </div>
              )}
            </div>
          </div>
          {application.status !== 'withdrawn' && application.status !== 'rejected' && (
            <button onClick={handleWithdraw} className="app-detail-withdraw-btn">
              Withdraw Application
            </button>
          )}
        </div>

        <div className="app-detail-body">
          {/* Offer Acceptance Flow (Selected or Accepted) */}
          {(application.status === 'selected' || application.status === 'accepted') && (
            <div className={`app-offer-card ${application.status === 'accepted' ? 'accepted' : 'selected'}`}>
              {application.status === 'selected' ? (
                <div>
                  <div className="app-offer-header">
                    <div className="app-offer-icon-wrapper selected">
                      <Award size={28} />
                    </div>
                    <div className="app-offer-meta">
                      <span className="app-offer-tag selected">
                        {isOffCampus ? 'Off-Campus Placement' : 'Offer Received'}
                      </span>
                      <h3 className="app-offer-title">
                        {isOffCampus ? "Congratulations! You've been Placed Off-Campus!" : "Congratulations! You've been selected!"}
                      </h3>
                    </div>
                  </div>
                  <p className="app-offer-desc">
                    Great news! The recruitment team has offered you the role of <strong>{application.job_title}</strong> at <strong>{application.company_name}</strong>. 
                    {isOffCampus
                      ? <> This is an <strong>off-campus</strong> placement. Please upload your official offer letter to finalize your records.</>
                      : <> Please review and accept your offer below, and upload your official offer letter to finalize your records.</>}
                  </p>

                  {uploadError && (
                    <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/25 text-danger text-xs flex items-center gap-2">
                      <AlertCircle size={14} />
                      {uploadError}
                    </div>
                  )}

                  <div className="app-offer-actions-row">
                    {!isOffCampus && (
                      <div className="app-offer-decision-block">
                        <div className="app-offer-buttons">
                          <button
                            onClick={() => handleAccept(null)}
                            disabled={uploading}
                            className="btn btn-success flex-1"
                          >
                            <Check size={16} strokeWidth={3} />
                            Accept Offer
                          </button>
                          <button
                            onClick={handleDecline}
                            disabled={uploading}
                            className="btn btn-danger-outline flex-1"
                          >
                            <XCircle size={16} />
                            Decline Offer
                          </button>
                        </div>
                        <div className="app-offer-tip">
                          Tip: You can drag and drop your offer letter onto the right side to accept and upload in one click.
                        </div>
                      </div>
                    )}

                    {/* Drag and Drop Zone */}
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`app-offer-dropzone ${dragActive ? 'active' : ''}`}
                    >
                      <input 
                        type="file" 
                        id="offer-letter-file" 
                        className="hidden" 
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        disabled={uploading}
                      />
                      <label htmlFor="offer-letter-file" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                        <div className="dropzone-icon-box">
                          <Upload size={18} />
                        </div>
                        <span className="dropzone-title">{isOffCampus ? 'Upload Offer Letter' : 'Accept & Upload Offer Letter'}</span>
                        <span className="dropzone-subtitle">PDF, Word, or Image up to 10MB</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="app-offer-header">
                    <div className="app-offer-icon-wrapper accepted">
                      <CheckCircle size={28} />
                    </div>
                    <div className="app-offer-meta">
                      <span className="app-offer-tag accepted">
                        {isOffCampus ? 'Off-Campus Placement Finalized' : 'Offer Accepted'}
                      </span>
                      <h3 className="app-offer-title">
                        {isOffCampus ? 'Off-Campus Placement Finalized! 🎉' : 'You accepted this Job Offer! 🎉'}
                      </h3>
                    </div>
                  </div>
                  <p className="app-offer-desc">
                    {isOffCampus 
                      ? <>Congratulations! Your off-campus placement records for <strong>{application.job_title}</strong> at <strong>{application.company_name}</strong> have been finalized.</>
                      : <>Congratulations! Your placement records have been updated to reflect your acceptance for the <strong>{application.job_title}</strong> role at <strong>{application.company_name}</strong>.</>}
                  </p>

                  {uploadError && (
                    <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/25 text-danger text-xs flex items-center gap-2">
                      <AlertCircle size={14} />
                      {uploadError}
                    </div>
                  )}

                  <div className="app-offer-letter-panel">
                    {application.offer_letter_uploaded ? (
                      <div className="app-offer-letter-info">
                        <div className="letter-icon-box success">
                          <FileText size={20} />
                        </div>
                        <div>
                          <span className="letter-title block">Official Offer Letter</span>
                          <a 
                            href={application.offer_letter_file} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="letter-link"
                          >
                            View Document ↗
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="app-offer-letter-info">
                        <div className="letter-icon-box warning animate-pulse">
                          <AlertCircle size={20} />
                        </div>
                        <div>
                          <span className="letter-title block">Offer Letter Missing</span>
                          <span className="text-[10px] text-muted block mt-0.5">Please upload your official document below.</span>
                        </div>
                      </div>
                    )}

                    {/* Upload / Re-upload Dropzone */}
                    <div className="letter-reupload-box">
                      <input 
                        type="file" 
                        id="offer-letter-reupload" 
                        className="hidden" 
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        disabled={uploading}
                      />
                      <label 
                        htmlFor="offer-letter-reupload" 
                        className="btn btn-outline btn-sm cursor-pointer flex items-center gap-1.5"
                      >
                        <Upload size={13} />
                        {application.offer_letter_uploaded ? 'Update Offer Letter' : 'Upload Offer Letter'}
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <h2 className="text-xl font-bold text-primary mb-6">Recruitment Pipeline</h2>
          <RoundPipeline rounds={application.rounds} currentRound={application.current_round} />
          
          {application.current_round && application.current_round.status === 'scheduled' && (
            <div className="mt-8 border rounded-lg p-6 flex items-start" style={{ background: 'var(--bg-card-hover)', borderColor: 'var(--border-color)' }}>
              <div className="p-3 rounded-full mr-4" style={{ background: 'var(--bg-input)', color: 'var(--info)' }}>
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">Upcoming Interview</h3>
                <p className="text-secondary mt-1">
                  You are scheduled for the <strong className="text-primary">{application.current_round.round_name}</strong> round.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-info uppercase font-bold tracking-wider">Date & Time</p>
                    <p className="font-medium text-primary">{format(new Date(application.current_round.scheduled_date), 'MMMM dd, yyyy - hh:mm a')}</p>
                  </div>
                  {application.current_round.interviewer_name && (
                    <div>
                      <p className="text-xs text-info uppercase font-bold tracking-wider">Interviewer</p>
                      <p className="font-medium text-primary">{application.current_round.interviewer_name}</p>
                    </div>
                  )}
                </div>
                {application.current_round.interview_link && (
                  <a href={application.current_round.interview_link} target="_blank" rel="noopener noreferrer" className="mt-4 btn btn-primary inline-flex">
                    Join Meeting <ExternalLink size={16} className="ml-2" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ApplicationDetail;
