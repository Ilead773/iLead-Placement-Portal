import React, { useEffect, useState } from 'react';
import axios from '../../api/axios';
import { Settings, Search, Shield, Save, ToggleLeft, ToggleRight, AlertTriangle, Calendar, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FeatureSettings() {
  const [configs, setConfigs] = useState([]);
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    const isAll = !updated[featureIndex].allowed_courses || updated[featureIndex].allowed_courses.length === 0;
    
    // Whitelist: if it is empty, all courses are allowed. Otherwise, only selected ones are allowed.
    let currentAllowed = isAll ? [...courses] : updated[featureIndex].allowed_courses;
    
    if (currentAllowed.includes(courseName)) {
      // Untick -> disable this course by removing it
      currentAllowed = currentAllowed.filter(c => c !== courseName);
    } else {
      // Tick -> enable this course by adding it back
      currentAllowed = [...currentAllowed, courseName];
    }
    
    // If all courses are checked again, reset to empty [] to clean database config
    if (currentAllowed.length === courses.length) {
      updated[featureIndex].allowed_courses = [];
    } else {
      updated[featureIndex].allowed_courses = currentAllowed;
    }
    setConfigs(updated);
  };

  const handleClearCourses = (featureIndex) => {
    const updated = [...configs];
    updated[featureIndex].allowed_courses = [];
    setConfigs(updated);
  };

  const handleYearToggle = (featureIndex, yearKey) => {
    const updated = [...configs];
    const isAll = !updated[featureIndex].allowed_years || updated[featureIndex].allowed_years.length === 0;
    
    let currentAllowed = isAll ? yearsList.map(y => y.key) : updated[featureIndex].allowed_years;
    
    if (currentAllowed.includes(yearKey)) {
      // Untick -> disable this year
      currentAllowed = currentAllowed.filter(y => y !== yearKey);
    } else {
      // Tick -> enable this year
      currentAllowed = [...currentAllowed, yearKey];
    }
    
    if (currentAllowed.length === yearsList.length) {
      updated[featureIndex].allowed_years = [];
    } else {
      updated[featureIndex].allowed_years = currentAllowed;
    }
    setConfigs(updated);
  };

  const handleClearYears = (featureIndex) => {
    const updated = [...configs];
    updated[featureIndex].allowed_years = [];
    setConfigs(updated);
  };

  const handleSaveSingleFeature = async (featureIndex) => {
    const config = configs[featureIndex];
    setSaving(true);
    const toastId = toast.loading(`Saving ${config.display_name} settings...`);
    try {
      await axios.put(`/admin-ops/features/${config.id}/`, config);
      toast.success(`${config.display_name} settings saved successfully! 🎉`, { id: toastId });
      fetchFeatureData();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to save ${config.display_name} settings.`, { id: toastId });
    } finally {
      setSaving(false);
    }
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
            Configure access to specific student portal features. Tick means enabled, untick to disable for that course/year.
          </p>
        </div>
        <div className="flex gap-3 self-start md:self-auto">
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
          <span>Checked items are enabled. Simply uncheck any course or year to disable access for that cohort.</span>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredConfigs.map((config, index) => {
          const originalIndex = configs.findIndex(c => c.id === config.id);
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
                    </div>
                    <p className="text-xs text-secondary mt-1 min-h-[32px]">{config.description || 'No description provided.'}</p>
                  </div>
                  
                  {/* Global Toggle button */}
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
                      {!isAllowedAllCourses && (
                        <button
                          onClick={() => handleClearCourses(originalIndex)}
                          className="text-[10px] text-blue-500 hover:text-blue-600 border-none bg-transparent cursor-pointer font-bold"
                          disabled={!config.is_enabled}
                        >
                          Allow All (Check All)
                        </button>
                      )}
                    </div>

                    {isAllowedAllCourses && (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 py-1 px-2 rounded.5 mb-2 border border-emerald-500/10 font-bold inline-block">
                        ✓ All courses are currently allowed
                      </div>
                    )}

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
                              disabled={!config.is_enabled}
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
                      {!isAllowedAllYears && (
                        <button
                          onClick={() => handleClearYears(originalIndex)}
                          className="text-[10px] text-blue-500 hover:text-blue-600 border-none bg-transparent cursor-pointer font-bold"
                          disabled={!config.is_enabled}
                        >
                          Allow All (Check All)
                        </button>
                      )}
                    </div>

                    {isAllowedAllYears && (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 py-1 px-2 rounded.5 mb-2 border border-emerald-500/10 font-bold inline-block">
                        ✓ All years are currently allowed
                      </div>
                    )}

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
                              disabled={!config.is_enabled}
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

              {/* Status footer bar with local Save button */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-4">
                <div className="text-[10px] text-secondary flex-1">
                  <div>
                    {config.is_enabled 
                      ? `Active for: ${isAllowedAllCourses ? 'All Courses' : `${config.allowed_courses.length} course(s)`} • ${isAllowedAllYears ? 'All Years' : `${config.allowed_years.length} year(s)`}` 
                      : 'Status: Deactivated Globally'
                    }
                  </div>
                  {(!isAllowedAllCourses || !isAllowedAllYears) && config.is_enabled && (
                    <span className="text-amber-500 flex items-center gap-1 font-semibold mt-1">
                      <AlertTriangle size={10} /> Cohort Targeted
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => handleSaveSingleFeature(originalIndex)}
                  className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1 hover:scale-[1.02] transition-transform shadow-md"
                >
                  <Save size={12} /> Save
                </button>
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

      {/* Blurred Loading Overlay */}
      {saving && (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-slate-900/30 backdrop-blur-[3px] transition-all duration-200">
          <div className="bg-card border border-border-color rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 max-w-xs text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div>
              <h4 className="text-sm font-bold text-primary">Saving Changes</h4>
              <p className="text-secondary text-xs mt-1">Please wait while the new feature configurations are applied...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
