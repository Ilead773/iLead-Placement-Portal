import React, { useEffect, useState } from 'react';
import axios from '../../api/axios';
import { Settings, Plus, Search, Shield, Save, CheckSquare, Square, ToggleLeft, ToggleRight, Trash2, X, AlertTriangle, Calendar, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FeatureSettings() {
  const [configs, setConfigs] = useState([]);
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Custom feature form fields
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const coreFeatures = ['mock-interview', 'resumes', 'jobs', 'internships', 'job-feed', 'saved-jobs', 'assignments', 'sessions', 'north-star'];
  
  const yearsList = [
    { key: '1st', label: '1st Year' },
    { key: '2nd', label: '2nd Year' },
    { key: '3rd', label: '3rd Year' },
    { key: '4th', label: '4th Year' }
  ];

  useEffect(() => {
    fetchFeatureData();
  }, []);

  const fetchFeatureData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/admin-ops/features/');
      setConfigs(response.data.configs || []);
      setCourses(response.data.courses || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load student feature settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalToggle = (index) => {
    const updated = [...configs];
    updated[index].is_enabled = !updated[index].is_enabled;
    setConfigs(updated);
  };

  const handleCourseToggle = (featureIndex, courseName) => {
    const updated = [...configs];
    const allowed = updated[featureIndex].allowed_courses || [];
    
    if (allowed.includes(courseName)) {
      updated[featureIndex].allowed_courses = allowed.filter(c => c !== courseName);
    } else {
      updated[featureIndex].allowed_courses = [...allowed, courseName];
    }
    setConfigs(updated);
  };

  const handleSelectAllCourses = (featureIndex, isAllSelected) => {
    const updated = [...configs];
    if (isAllSelected) {
      // Currently enabled for all (empty allowed_courses). Switch to restricted mode by checking all.
      updated[featureIndex].allowed_courses = [...courses];
    } else {
      // Currently restricted (not empty). Switch back to enabled for all by clearing it.
      updated[featureIndex].allowed_courses = [];
    }
    setConfigs(updated);
  };

  const handleYearToggle = (featureIndex, yearKey) => {
    const updated = [...configs];
    const allowed = updated[featureIndex].allowed_years || [];
    
    if (allowed.includes(yearKey)) {
      updated[featureIndex].allowed_years = allowed.filter(y => y !== yearKey);
    } else {
      updated[featureIndex].allowed_years = [...allowed, yearKey];
    }
    setConfigs(updated);
  };

  const handleSelectAllYears = (featureIndex, isAllSelected) => {
    const updated = [...configs];
    if (isAllSelected) {
      // Currently enabled for all (empty allowed_years). Switch to restricted mode by checking all.
      updated[featureIndex].allowed_years = yearsList.map(y => y.key);
    } else {
      // Currently restricted (not empty). Switch back to enabled for all by clearing it.
      updated[featureIndex].allowed_years = [];
    }
    setConfigs(updated);
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    const toastId = toast.loading('Saving features configuration...');
    try {
      await axios.post('/admin-ops/features/bulk-update/', configs);
      toast.success('Configuration saved successfully! 🎉', { id: toastId });
      fetchFeatureData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save configuration.', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleAddFeature = async (e) => {
    e.preventDefault();
    if (!newKey || !newName) {
      toast.error('Feature key and name are required.');
      return;
    }
    
    if (!/^[a-z0-9-]+$/.test(newKey)) {
      toast.error('Feature Key must be lowercase alphanumeric and hyphens only (e.g. mock-interview).');
      return;
    }

    const toastId = toast.loading('Adding new feature flag...');
    try {
      await axios.post('/admin-ops/features/', {
        feature_key: newKey,
        display_name: newName,
        description: newDesc
      });
      toast.success('New feature flag added successfully!', { id: toastId });
      setShowAddModal(false);
      setNewKey('');
      setNewName('');
      setNewDesc('');
      fetchFeatureData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to add feature flag.', { id: toastId });
    }
  };

  const handleDeleteFeature = async (id, name, key) => {
    if (coreFeatures.includes(key)) {
      toast.error('Core system features cannot be deleted.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the custom feature "${name}"? This cannot be undone.`)) {
      return;
    }

    const toastId = toast.loading('Deleting feature...');
    try {
      await axios.delete(`/admin-ops/features/${id}/`);
      toast.success('Feature deleted successfully.', { id: toastId });
      fetchFeatureData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to delete feature.', { id: toastId });
    }
  };

  const filteredConfigs = configs.filter(config => 
    config.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    config.feature_key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="page-header mb-8 flex justify-between items-center">
          <div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-96 hidden sm:block"></div>
          </div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card border border-border-color p-6 rounded-2xl h-[320px]">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-6"></div>
              <div className="h-[160px] bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Page Header */}
      <div className="page-header mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ fontFamily: 'var(--font-heading)' }}>
            <Settings size={28} className="text-primary" />
            Student Feature Control
          </h1>
          <p className="text-secondary text-sm mt-1">
            Configure access to specific student portal features globally, by course, or selectively by academic year.
          </p>
        </div>
        <div className="flex gap-3 self-start md:self-auto">
          <button 
            onClick={() => setShowAddModal(true)} 
            className="btn btn-secondary flex items-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <Plus size={18} /> Add Custom Feature
          </button>
          <button 
            onClick={handleSaveChanges} 
            disabled={saving}
            className="btn btn-primary flex items-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-blue-500/20"
          >
            <Save size={18} /> {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* Filter and helper */}
      <div className="bg-card border border-border-color p-4 rounded-2xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input 
            type="text" 
            placeholder="Search features..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full pl-12"
          />
        </div>
        <div className="flex items-center gap-2 text-secondary text-xs bg-slate-100 dark:bg-slate-800 py-2 px-3 rounded-lg self-start sm:self-auto border border-border-color">
          <Shield size={14} className="text-blue-500" />
          <span>Restricting by both course and year allows granular cohort targeting.</span>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredConfigs.map((config, index) => {
          const originalIndex = configs.findIndex(c => c.id === config.id);
          const isCore = coreFeatures.includes(config.feature_key);
          const isAllowedAllCourses = !config.allowed_courses || config.allowed_courses.length === 0;
          const isAllowedAllYears = !config.allowed_years || config.allowed_years.length === 0;
          
          return (
            <div 
              key={config.id} 
              className={`bg-card border rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between ${
                config.is_enabled 
                  ? 'border-border-color hover:shadow-xl hover:shadow-slate-100 dark:hover:shadow-none' 
                  : 'border-slate-200 dark:border-slate-800 opacity-70 bg-slate-50/50 dark:bg-slate-900/30'
              }`}
            >
              <div>
                {/* Card Title Bar */}
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-primary">{config.display_name}</h3>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-secondary py-0.5 px-2 rounded-full border border-border-color font-mono uppercase">
                        {config.feature_key}
                      </span>
                      {isCore && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 py-0.5 px-2 rounded-full font-medium">
                          Core
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-secondary mt-1 min-h-[32px]">{config.description || 'No description provided.'}</p>
                  </div>
                  
                  {/* Global Toggle & Delete buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleGlobalToggle(originalIndex)}
                      className="cursor-pointer border-none bg-transparent p-0 flex"
                      title={config.is_enabled ? "Deactivate Globally" : "Activate Globally"}
                    >
                      {config.is_enabled ? (
                        <ToggleRight size={44} className="text-blue-500" />
                      ) : (
                        <ToggleLeft size={44} className="text-slate-400" />
                      )}
                    </button>
                    {!isCore && (
                      <button
                        onClick={() => handleDeleteFeature(config.id, config.display_name, config.feature_key)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Delete Custom Feature"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-4" />

                {/* Grid for Courses and Years check lists */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Target Courses Selector */}
                  <div className="lg:col-span-8">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-secondary flex items-center gap-1.5">
                        <GraduationCap size={14} className="text-primary" /> Target Courses
                      </span>
                      <button
                        onClick={() => handleSelectAllCourses(originalIndex, isAllowedAllCourses)}
                        disabled={!config.is_enabled}
                        className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-600 border-none bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAllowedAllCourses ? <CheckSquare size={13} /> : <Square size={13} />}
                        <span>{isAllowedAllCourses ? 'All Courses' : 'Restrict'}</span>
                      </button>
                    </div>

                    <div className="max-h-[140px] overflow-y-auto flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 p-2.5 rounded-xl border border-border-color">
                      {courses.map(courseName => {
                        const isSelected = isAllowedAllCourses || (config.allowed_courses || []).includes(courseName);
                        return (
                          <label 
                            key={courseName} 
                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors border ${
                              !config.is_enabled 
                                ? 'opacity-40 cursor-not-allowed border-transparent' 
                                : isSelected
                                  ? 'bg-blue-500/5 border-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold' 
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent text-secondary'
                            }`}
                          >
                            <input 
                              type="checkbox"
                              disabled={!config.is_enabled || isAllowedAllCourses}
                              checked={isSelected}
                              onChange={() => handleCourseToggle(originalIndex, courseName)}
                              className="w-3.5 h-3.5 accent-blue-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span className="truncate" title={courseName}>{courseName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target Years Selector */}
                  <div className="lg:col-span-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-secondary flex items-center gap-1.5">
                        <Calendar size={14} className="text-primary" /> Target Years
                      </span>
                      <button
                        onClick={() => handleSelectAllYears(originalIndex, isAllowedAllYears)}
                        disabled={!config.is_enabled}
                        className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-600 border-none bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAllowedAllYears ? <CheckSquare size={13} /> : <Square size={13} />}
                        <span>{isAllowedAllYears ? 'All Years' : 'Restrict'}</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 p-2.5 rounded-xl border border-border-color min-h-[140px]">
                      {yearsList.map(y => {
                        const isSelected = isAllowedAllYears || (config.allowed_years || []).includes(y.key);
                        return (
                          <label 
                            key={y.key} 
                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors border ${
                              !config.is_enabled 
                                ? 'opacity-40 cursor-not-allowed border-transparent' 
                                : isSelected
                                  ? 'bg-blue-500/5 border-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold' 
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent text-secondary'
                            }`}
                          >
                            <input 
                              type="checkbox"
                              disabled={!config.is_enabled || isAllowedAllYears}
                              checked={isSelected}
                              onChange={() => handleYearToggle(originalIndex, y.key)}
                              className="w-3.5 h-3.5 accent-blue-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span>{y.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {/* Status footer bar */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-secondary">
                <span>
                  {config.is_enabled 
                    ? `Active for: ${isAllowedAllCourses ? 'All Courses' : `${config.allowed_courses.length} course(s)`} • ${isAllowedAllYears ? 'All Years' : `${config.allowed_years.length} year(s)`}` 
                    : 'Status: Deactivated Globally'
                  }
                </span>
                {(!isAllowedAllCourses || !isAllowedAllYears) && config.is_enabled && (
                  <span className="text-amber-500 flex items-center gap-1 font-semibold">
                    <AlertTriangle size={10} /> Cohort Targeted
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredConfigs.length === 0 && (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-border-color">
          <p className="text-secondary text-sm">No feature flags match your search query.</p>
        </div>
      )}

      {/* Add Custom Feature Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            onClick={() => setShowAddModal(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <form 
            onSubmit={handleAddFeature}
            className="relative bg-card border border-border-color rounded-2xl w-full max-w-md shadow-2xl p-6 overflow-hidden flex flex-col gap-4"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
            
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-primary">Create Feature Flag</h3>
                <p className="text-secondary text-xs mt-1">Add a new custom page or section controller.</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-secondary"
              >
                <X size={18} />
              </button>
            </div>

            <div className="h-[1px] bg-slate-100 dark:bg-slate-800" />

            <div className="flex flex-col gap-3">
              <div className="input-group">
                <label className="block text-xs font-bold text-primary mb-1.5">Feature Key (URL/Identifier)</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. resume-grading"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="input-field w-full font-mono text-xs"
                />
                <span className="text-[10px] text-secondary mt-1 block">
                  Only lowercase letters, numbers, and hyphens (no spaces). This is used in routing.
                </span>
              </div>

              <div className="input-group">
                <label className="block text-xs font-bold text-primary mb-1.5">Display Name</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. Resume Grading"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input-field w-full"
                />
              </div>

              <div className="input-group">
                <label className="block text-xs font-bold text-primary mb-1.5">Description</label>
                <textarea 
                  rows="3" 
                  placeholder="Describe the feature purpose..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="input-field w-full text-sm"
                />
              </div>
            </div>

            <div className="h-[1px] bg-slate-100 dark:bg-slate-800 mt-2" />

            <div className="flex gap-3 justify-end">
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary text-sm py-2"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="btn btn-primary text-sm py-2 shadow-lg shadow-blue-500/20"
              >
                Add Feature
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
