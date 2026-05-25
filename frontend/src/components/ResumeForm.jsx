import React from 'react';

export default function ResumeForm({ data, onChange }) {
  const handleChangePath = (path, newValue) => {
    try {
      const newData = JSON.parse(JSON.stringify(data));
      const parts = path.replace(/\]/g, '').split(/[.\[]/).filter(Boolean);
      let current = newData;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = newValue;
      onChange(newData);
    } catch (e) {
      console.error("Path update error", e);
    }
  };

  const renderField = (key, value, path) => {
    if (value === null || value === undefined) return null;

    const label = key.replace(/_/g, ' ');

    if (typeof value === 'string') {
      return (
        <div key={path} className="mb-3">
          <label className="block text-[11px] font-bold text-muted mb-1 uppercase tracking-wider">{label}</label>
          {value.length > 50 || key.includes('description') || key.includes('summary') ? (
            <textarea 
              value={value} 
              onChange={e => handleChangePath(path, e.target.value)}
              className="input-field w-full min-h-[80px]"
            />
          ) : (
            <input 
              type="text" 
              value={value} 
              onChange={e => handleChangePath(path, e.target.value)}
              className="input-field w-full"
            />
          )}
        </div>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <div key={path} className="mb-3 flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={value} 
            onChange={e => handleChangePath(path, e.target.checked)}
            className="w-4 h-4 rounded border-dark-300 text-primary focus:ring-primary"
          />
          <label className="text-sm font-bold text-muted capitalize">{label}</label>
        </div>
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return null;

      if (typeof value[0] === 'string') {
         return (
           <div key={path} className="mb-4 p-3 border border-dark-300/50 bg-dark-900/30 rounded-lg">
             <label className="block text-[11px] font-bold text-primary mb-2 uppercase tracking-wider">{label}</label>
             <textarea 
               value={value.join(', ')}
               onChange={e => handleChangePath(path, e.target.value.split(',').map(s => s.trim()))}
               className="input-field w-full min-h-[60px]"
               placeholder="Comma separated values"
             />
             <p className="text-[10px] text-muted mt-1">Separate items with commas</p>
           </div>
         );
      }
      
      return (
        <div key={path} className="mb-6">
          <h4 className="font-bold text-primary mb-3 uppercase tracking-wide text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
            {label}
          </h4>
          <div className="space-y-3">
            {value.map((item, index) => (
              <div key={`${path}[${index}]`} className="p-4 bg-dark-200/40 border border-dark-300/60 rounded-xl relative hover:border-primary/30 transition-colors">
                <div className="absolute top-3 right-4 text-[10px] font-bold text-muted bg-dark-300/50 px-2 py-1 rounded">Item {index + 1}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(item).map(([k, v]) => (
                    <div key={k} className={typeof v === 'string' && v.length > 50 ? 'md:col-span-2' : ''}>
                      {renderField(k, v, `${path}[${index}].${k}`)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <div key={path} className="mb-4 p-4 bg-dark-900/50 border border-dark-300 rounded-xl">
          <label className="block text-[11px] font-bold text-info mb-3 uppercase tracking-wider">{label}</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(value).map(([k, v]) => (
               <div key={k} className={typeof v === 'string' && v.length > 50 ? 'md:col-span-2' : ''}>
                 {renderField(k, v, `${path}.${k}`)}
               </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="resume-visual-editor space-y-6">
      {Object.entries(data).map(([key, value]) => renderField(key, value, key))}
    </div>
  );
}
