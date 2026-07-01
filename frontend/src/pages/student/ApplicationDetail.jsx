import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import RoundPipeline from '../../components/RoundPipeline';
import { Building2, Calendar, MapPin, ExternalLink, ArrowLeft, Check, XCircle, Upload, AlertCircle, Award, CheckCircle, FileText, Clock } from 'lucide-react';
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
    if (!file) return;
    const loadingToast = toast.loading('Submitting offer letter...');
    try {
      const formData = new FormData();
      formData.append('offer_letter_file', file);
      setUploading(true);
      setUploadError('');
      setUploadSuccess('');
      const response = await axios.patch(`/applications/applications/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setApplication(response.data);
      setUploadSuccess(`Offer letter "${file.name}" uploaded successfully. It is now under review.`);
      toast.success('Offer letter submitted for review! ⏳', { id: loadingToast });
    } catch (err) {
      console.error(err);
      setUploadError('Failed to upload offer letter. Please try again.');
      toast.error('Failed to upload offer letter.', { id: loadingToast });
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
      setUploading(true);
      setUploadError('');
      setUploadSuccess('');
      const response = await axios.patch(`/applications/applications/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setApplication(response.data);
      setUploadSuccess(`Offer letter "${file.name}" uploaded successfully and submitted for review.`);
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
      if (file.size > 2 * 1024 * 1024) {
        setUploadError('File is too large. Maximum size is 2MB.');
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
      if (file.size > 2 * 1024 * 1024) {
        setUploadError('File is too large. Maximum size is 2MB.');
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
            <div className="app-detail-badges flex flex-wrap items-center gap-3">
              <div className="app-detail-badge">
                Status: <span className="ml-2 uppercase tracking-wide">{application.status}</span>
              </div>
              {isOffCampus && (
                <div className="app-detail-badge off-campus">
                  Off-Campus
                </div>
              )}
              {application.offer_letter_status && (
                <div className="app-detail-badge">
                  Offer: <span className="ml-2 uppercase tracking-wide">
                    {application.offer_letter_status === 'pending_upload' && 'Pending Upload'}
                    {application.offer_letter_status === 'pending_verification' && 'Pending Verification'}
                    {application.offer_letter_status === 'approved' && 'Verified'}
                    {application.offer_letter_status === 'rejected' && 'Rejected'}
                  </span>
                </div>
              )}
              {application.offer_letter_file && (
                <a 
                  href={application.offer_letter_file} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="app-detail-badge hover:bg-white/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  📄 Offer Contract ↗
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="app-detail-body">
          {application.job_status === 'closed' && !['selected', 'accepted'].includes(application.status) && (
            <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/25 text-danger flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm m-0 text-danger" style={{ color: 'var(--danger)' }}>Recruitment Drive Closed</h4>
                <p className="text-xs text-secondary mt-1 leading-relaxed">
                  This job opportunity has been closed by the placement cell. No further round updates or selections will take place for this position.
                </p>
              </div>
            </div>
          )}

          {/* Offer Acceptance Flow (Selected or Accepted) */}
          {(application.status === 'selected' || application.status === 'accepted') && (
            <div className={`app-offer-card ${application.offer_letter_status === 'approved' ? 'accepted' : 'selected'}`}>
              
              {/* Case 1: pending_upload (No document yet) */}
              {application.offer_letter_status === 'pending_upload' && (
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
                    Great news! The recruitment team has offered you the role of <strong>{application.job_title}</strong> at <strong>{application.company_name}</strong>. Please upload your official offer letter to finalize your records.
                  </p>

                  {uploadError && (
                    <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/25 text-danger text-xs flex items-center gap-2">
                      <AlertCircle size={14} />
                      {uploadError}
                    </div>
                  )}

                  <div className="app-offer-actions-row">
                    {/* Drag and Drop Zone */}
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`app-offer-dropzone ${dragActive ? 'active' : ''}`}
                      style={{ flex: '1 1 100%' }}
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
                        <span className="dropzone-subtitle">PDF, Word, or Image up to 2MB</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Case 2: pending_verification (Document uploaded, waiting for review) */}
              {application.offer_letter_status === 'pending_verification' && (
                <div>
                  <div className="app-offer-header">
                    <div className="app-offer-icon-wrapper selected animate-pulse">
                      <Clock size={28} className="text-info" />
                    </div>
                    <div className="app-offer-meta">
                      <span className="app-offer-tag selected" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.2)' }}>
                        Under Verification
                      </span>
                      <h3 className="app-offer-title">
                        Offer Letter Submitted
                      </h3>
                    </div>
                  </div>
                  <p className="app-offer-desc">
                    Your offer letter for <strong>{application.job_title}</strong> at <strong>{application.company_name}</strong> has been submitted. The placement cell is currently verifying your document. You will be notified once it is approved.
                  </p>

                  <div className="app-offer-letter-panel mt-6 p-6 rounded-2xl bg-card border border-border-color shadow-sm relative overflow-hidden group flex justify-between items-center">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-info"></div>
                    <div className="absolute right-[-20px] top-[-20px] opacity-5 transform rotate-12 pointer-events-none transition-transform group-hover:scale-110 duration-500">
                      <FileText size={150} />
                    </div>
                    <div className="app-offer-letter-info flex items-center gap-5 relative z-10">
                      <div className="letter-icon-box info w-14 h-14 rounded-2xl bg-info/10 flex items-center justify-center border border-info/20 shadow-inner">
                        <FileText size={28} className="text-info" />
                      </div>
                      <div>
                        <span className="letter-title block text-[11px] font-black text-secondary mb-1 uppercase tracking-widest">Official Document</span>
                        <a 
                          href={application.offer_letter_file} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="letter-link inline-flex items-center gap-2 text-info hover:text-blue-700 font-extrabold text-sm bg-info/5 px-4 py-2 rounded-xl transition-all hover:bg-info/10 border border-transparent hover:border-info/20"
                        >
                          View Uploaded File <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>

                    {/* Allow student to update if needed */}
                    <div className="letter-reupload-box relative z-10">
                      <input 
                        type="file" 
                        id="offer-letter-update" 
                        className="hidden" 
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        disabled={uploading}
                      />
                      <label 
                        htmlFor="offer-letter-update" 
                        className="btn btn-outline cursor-pointer flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border-border-color hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <Upload size={14} />
                        Update
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Case 3: approved (Document verified, placement confirmed) */}
              {application.offer_letter_status === 'approved' && (
                <div>
                  <div className="app-offer-header">
                    <div className="app-offer-icon-wrapper accepted">
                      <CheckCircle size={28} />
                    </div>
                    <div className="app-offer-meta">
                      <span className="app-offer-tag accepted">
                        Placement Confirmed
                      </span>
                      <h3 className="app-offer-title">
                        Placement Confirmed! 🎉
                      </h3>
                    </div>
                  </div>
                  <p className="app-offer-desc">
                    Congratulations! Your placement records have been verified and finalized for the <strong>{application.job_title}</strong> position at <strong>{application.company_name}</strong>.
                  </p>

                  <div className="app-offer-letter-panel mt-6 p-6 rounded-2xl bg-card border border-emerald-500/30 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                    <div className="absolute right-[-20px] top-[-20px] opacity-5 transform rotate-12 pointer-events-none transition-transform group-hover:scale-110 duration-500">
                      <Award size={150} className="text-emerald-500" />
                    </div>
                    <div className="app-offer-letter-info flex items-center gap-5 relative z-10">
                      <div className="letter-icon-box success w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                        <FileText size={28} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <span className="letter-title block text-[11px] font-black text-secondary mb-1 uppercase tracking-widest flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-500" /> Verified Document</span>
                        <a 
                          href={application.offer_letter_file} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="letter-link inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-extrabold text-sm bg-emerald-500/10 px-4 py-2 rounded-xl transition-all hover:bg-emerald-500/20 border border-transparent hover:border-emerald-500/30"
                        >
                          View Official Contract <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-5 rounded-xl border border-border-color bg-card-hover shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                      <Briefcase size={100} />
                    </div>
                    <h4 className="text-xs font-black uppercase text-secondary tracking-widest mb-4 flex items-center gap-2 relative z-10"><Briefcase size={14} className="text-info" /> Next Steps & Onboarding</h4>
                    <ul className="text-sm text-secondary space-y-3 relative z-10">
                      <li className="flex items-start gap-3"><CheckCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" /> <span>Your profile is now marked as <strong>Placed</strong> in the iLEAD database.</span></li>
                      <li className="flex items-start gap-3"><CheckCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" /> <span>Keep an eye on your email inbox. The HR team will contact you directly with official onboarding instructions and your joining schedule.</span></li>
                      <li className="flex items-start gap-3"><CheckCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" /> <span>No further action is required on this dashboard. This placement record and your official contract will be permanently archived in your secure vault for future reference.</span></li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Case 4: rejected (Document rejected, feedback shown, upload form visible) */}
              {application.offer_letter_status === 'rejected' && (
                <div>
                  <div className="app-offer-header">
                    <div className="app-offer-icon-wrapper selected bg-red-500/10 border border-red-500/25">
                      <XCircle size={28} className="text-danger" />
                    </div>
                    <div className="app-offer-meta">
                      <span className="app-offer-tag selected bg-red-500/10 text-red-500 border border-red-500/20">
                        Verification Failed
                      </span>
                      <h3 className="app-offer-title text-danger">
                        Offer Letter Rejected
                      </h3>
                    </div>
                  </div>
                  
                  {/* Feedback Message */}
                  <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/25 text-danger flex items-start gap-3">
                    <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm m-0 text-danger" style={{ color: 'var(--danger)' }}>Rejection Feedback</h4>
                      <p className="text-xs text-secondary mt-1 leading-relaxed">
                        {application.offer_letter_feedback || "The uploaded document was invalid or unreadable. Please check again."}
                      </p>
                    </div>
                  </div>

                  <p className="app-offer-desc">
                    Please upload a corrected and valid official offer letter for <strong>{application.job_title}</strong> at <strong>{application.company_name}</strong> to proceed.
                  </p>

                  {uploadError && (
                    <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/25 text-danger text-xs flex items-center gap-2">
                      <AlertCircle size={14} />
                      {uploadError}
                    </div>
                  )}

                  <div className="app-offer-actions-row">
                    {/* Drag and Drop Zone */}
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`app-offer-dropzone ${dragActive ? 'active' : ''}`}
                      style={{ flex: '1 1 100%' }}
                    >
                      <input 
                        type="file" 
                        id="offer-letter-file-retry" 
                        className="hidden" 
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        disabled={uploading}
                      />
                      <label htmlFor="offer-letter-file-retry" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                        <div className="dropzone-icon-box">
                          <Upload size={18} />
                        </div>
                        <span className="dropzone-title">Re-upload Offer Letter</span>
                        <span className="dropzone-subtitle">PDF, Word, or Image up to 2MB</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {application.status === 'applied' ? (
            <div className="p-6 rounded-2xl border border-border-color bg-card-hover/20 flex items-start gap-4 my-8">
              <div className="p-3 bg-info/10 text-info rounded-xl">
                <Clock size={20} className="animate-pulse" style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div>
                <h4 className="font-bold text-primary mb-1">Application Received</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  Your application for this role has been submitted. The placement cell is currently reviewing candidate profiles. Once you are shortlisted or scheduled for rounds, your recruitment tracking pipeline will appear here.
                </p>
              </div>
            </div>
          ) : !isOffCampus ? (
            <>
              <h2 className="text-xl font-bold text-primary mb-6">Recruitment Pipeline</h2>
              <RoundPipeline 
                rounds={application.rounds} 
                currentRound={application.current_round} 
                status={application.status}
                appliedAt={application.applied_at}
              />
            </>
          ) : null}
          
          {!isOffCampus && application.current_round && application.current_round.status === 'scheduled' && (
            <div className="mt-8 border rounded-lg p-6 flex items-start" style={{ background: 'var(--bg-card-hover)', borderColor: 'var(--border-color)' }}>
              <div className="p-3 rounded-full mr-4" style={{ background: 'var(--bg-input)', color: 'var(--info)' }}>
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">Upcoming Interview</h3>
                <p className="text-secondary mt-1">
                  You are scheduled for the <strong className="text-primary">{application.current_round.round_name}</strong> round.
                </p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
