import React from 'react';

export default function OnScreenResumeEditor({ data, onChange }) {
  const updateField = (path, value) => {
    try {
      const newData = JSON.parse(JSON.stringify(data));
      const parts = path.split(/[.\[\]]+/).filter(Boolean);
      let current = newData;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = isNaN(parts[i+1]) ? {} : [];
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      onChange(newData);
    } catch (e) {
      console.error("Path update error", e);
    }
  };

  const EditableText = ({ tag: Tag = 'div', path, value, placeholder, style }) => {
    return (
      <Tag 
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => updateField(path, e.currentTarget.innerText || '')}
        style={{
          outline: 'none',
          padding: '2px 4px',
          margin: '-2px -4px',
          borderRadius: '4px',
          border: '1px solid transparent',
          minWidth: '30px',
          display: 'inline-block',
          ...style
        }}
        onFocus={(e) => { e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)'; e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'; }}
        onBlurCapture={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
        data-placeholder={placeholder}
      >
        {value || placeholder}
      </Tag>
    );
  };

  const EditableStringArray = ({ path, values, style }) => {
    const text = Array.isArray(values) ? values.join(', ') : '';
    return (
      <div 
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const arr = e.currentTarget.innerText.split(',').map(s => s.trim()).filter(Boolean);
          updateField(path, arr);
        }}
        style={{
          outline: 'none',
          padding: '2px 4px',
          margin: '-2px -4px',
          borderRadius: '4px',
          border: '1px solid transparent',
          ...style
        }}
        onFocus={(e) => { e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)'; e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'; }}
        onBlurCapture={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
      >
        {text || 'Add items (comma separated)...'}
      </div>
    );
  };

  const pi = data?.personal_info || {};
  const exp = Array.isArray(data?.experience) ? data.experience : [];
  const edu = Array.isArray(data?.education) ? data.education : [];
  const proj = Array.isArray(data?.projects) ? data.projects : [];
  const skills = data?.skills || [];
  const summary = data?.summary || '';

  const paperStyle = {
    backgroundColor: '#ffffff',
    color: '#333333',
    width: '100%',
    maxWidth: '850px',
    minHeight: '1100px', // A4 aspect approx
    margin: '0 auto',
    padding: '40px 50px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: 1.5,
  };

  const sectionHeaderStyle = {
    fontSize: '16px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '1px solid #cccccc',
    paddingBottom: '4px',
    marginBottom: '16px',
    marginTop: '24px',
    color: '#111',
  };

  return (
    <div style={paperStyle}>
      {/* HEADER */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '24px' }}>
        <EditableText 
          tag="h1" 
          path="personal_info.name" 
          value={pi.name} 
          placeholder="YOUR FULL NAME" 
          style={{ fontSize: '32px', fontWeight: '900', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '-0.5px' }} 
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', fontSize: '14px', color: '#555' }}>
          <EditableText tag="span" path="personal_info.email" value={pi.email} placeholder="Email" />
          <span>•</span>
          <EditableText tag="span" path="personal_info.phone" value={pi.phone} placeholder="Phone" />
          <span>•</span>
          <EditableText tag="span" path="personal_info.location" value={pi.location} placeholder="Location" />
        </div>
      </div>

      {/* SUMMARY */}
      <EditableText 
        tag="div" 
        path="summary" 
        value={summary} 
        placeholder="Professional summary..." 
        style={{ fontSize: '14px', textAlign: 'justify', marginBottom: '24px' }} 
      />

      {/* EXPERIENCE */}
      {exp.length > 0 && (
        <div>
          <h2 style={sectionHeaderStyle}>Experience</h2>
          {exp.map((item, index) => (
            <div key={index} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                <EditableText tag="strong" path={`experience[${index}].position`} value={item.position} placeholder="Job Title" style={{ fontSize: '16px', color: '#111' }} />
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#555' }}>
                  <EditableText tag="span" path={`experience[${index}].duration.start`} value={item.duration?.start} placeholder="Start" />
                  <span style={{ margin: '0 4px' }}>-</span>
                  <EditableText tag="span" path={`experience[${index}].duration.end`} value={item.duration?.current ? 'Present' : item.duration?.end} placeholder="End" />
                </div>
              </div>
              <EditableText tag="div" path={`experience[${index}].company`} value={item.company} placeholder="Company Name" style={{ fontStyle: 'italic', fontSize: '15px', color: '#444', marginBottom: '6px' }} />
              <EditableText tag="div" path={`experience[${index}].description`} value={item.description} placeholder="Description..." style={{ fontSize: '14px' }} />
            </div>
          ))}
        </div>
      )}

      {/* EDUCATION */}
      {edu.length > 0 && (
        <div>
          <h2 style={sectionHeaderStyle}>Education</h2>
          {edu.map((item, index) => (
            <div key={index} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <EditableText tag="strong" path={`education[${index}].degree`} value={item.degree} placeholder="Degree" style={{ fontSize: '16px' }} />
                  <span style={{ margin: '0 6px' }}>in</span>
                  <EditableText tag="strong" path={`education[${index}].field`} value={item.field} placeholder="Field of Study" style={{ fontSize: '16px' }} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#555' }}>
                  <EditableText tag="span" path={`education[${index}].duration.start`} value={item.duration?.start} placeholder="Start" />
                  <span style={{ margin: '0 4px' }}>-</span>
                  <EditableText tag="span" path={`education[${index}].duration.end`} value={item.duration?.end} placeholder="End" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '4px' }}>
                <EditableText tag="div" path={`education[${index}].institution`} value={item.institution} placeholder="Institution" style={{ fontStyle: 'italic' }} />
                <EditableText tag="div" path={`education[${index}].score`} value={item.score} placeholder="Score" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SKILLS */}
      {skills.length > 0 && (
        <div>
          <h2 style={sectionHeaderStyle}>Skills</h2>
          {typeof skills[0] === 'string' ? (
            <EditableStringArray path="skills" values={skills} style={{ fontSize: '14px' }} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
               {skills.map((cat, idx) => (
                 <div key={idx} style={{ fontSize: '14px' }}>
                   <EditableText tag="strong" path={`skills[${idx}].category`} value={cat.category} placeholder="Category" style={{ marginRight: '8px' }} />
                   <EditableStringArray path={`skills[${idx}].items`} values={cat.items} style={{ display: 'inline' }} />
                 </div>
               ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
