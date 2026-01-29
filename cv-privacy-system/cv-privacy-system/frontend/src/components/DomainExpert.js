import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, XCircle, FileText, AlertCircle, BookOpen } from 'lucide-react';

const DomainExpertUpload = ({ user, onLogout }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    fetchCurrentConfig();
  }, []);

  const fetchCurrentConfig = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/domain/config');
      if (response.ok) {
        const config = await response.json();
        setCurrentConfig(config);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const validateConfigFile = (config) => {
  const errors = [];
  
  // Accept either 'domain' OR 'configName'
  if (!config.domain && !config.configName) {
    errors.push('Missing required field: domain');
  }
  
  if (!config.dataTypes || !Array.isArray(config.dataTypes)) {
    errors.push('Missing or invalid field: dataTypes (must be array)');
  }
  
  // Accept either 'contexts' OR 'situations'
  const contexts = config.contexts || config.situations;
  if (!contexts || !Array.isArray(contexts)) {
    errors.push('Missing or invalid field: contexts (must be array)');
  }
  
  // Accept either 'services' OR 'purposes'
  const services = config.services || config.purposes;
  if (!services || !Array.isArray(services)) {
    errors.push('Missing or invalid field: services (must be array)');
  }
  
  if (services) {
    services.forEach((service, idx) => {
      if (!service.id) errors.push(`Service/Purpose ${idx + 1}: Missing 'id'`);
      if (!service.name && !service.displayName) {
        errors.push(`Service/Purpose ${idx + 1}: Missing 'name' or 'displayName'`);
      }
      // Accept 'dataTypes', 'usesDataTypes', or 'questions' with 'affectsDataTypes'
      const hasDataTypes = service.dataTypes || service.usesDataTypes || service.questions;
      if (!hasDataTypes) {
        errors.push(`Service/Purpose ${idx + 1}: Missing data type configuration`);
      }
    });
  }
  
  return errors;
};

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setValidationErrors(['Only JSON files are accepted']);
      setSelectedFile(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        const errors = validateConfigFile(config);
        if (errors.length > 0) {
          setValidationErrors(errors);
          setSelectedFile(null);
        } else {
          setValidationErrors([]);
          setSelectedFile({ file, config });
        }
      } catch (error) {
        setValidationErrors(['Invalid JSON format: ' + error.message]);
        setSelectedFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadStatus('uploading');
    try {
      const response = await fetch('http://localhost:4000/api/domain/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedFile.config)
      });
      if (response.ok) {
        setUploadStatus('success');
        setCurrentConfig(selectedFile.config);
        setSelectedFile(null);
        setTimeout(() => setUploadStatus(null), 5000);
      } else {
        setUploadStatus('error');
        setValidationErrors(['Upload failed: ' + (await response.text())]);
      }
    } catch (error) {
      setUploadStatus('error');
      setValidationErrors(['Upload failed: ' + error.message]);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Sidebar */}
      <div style={{
        width: '280px',
        background: 'linear-gradient(180deg, #2c3e50 0%, #34495e 100%)',
        color: 'white',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
            🔧 Domain Expert
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', opacity: 0.8 }}>
            System Administration
          </p>
        </div>

        <nav style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: '600', opacity: 0.6, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Navigation
          </div>
          <div style={{
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            marginBottom: '8px',
            fontWeight: '500',
            fontSize: '14px'
          }}>
            📤 Upload Configuration
          </div>
        </nav>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '16px'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            {user.username}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '12px' }}>
            Administrator
          </div>
          <button
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
              Domain Configuration Upload
            </h2>
            <p style={{ margin: '8px 0 0 0', color: '#6c757d', fontSize: '16px' }}>
              Upload a JSON configuration file to define data types, contexts, and services for the privacy preference system
            </p>
          </div>

          {/* Instructions Button */}
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <BookOpen size={20} />
              {showInstructions ? 'Hide' : 'Show'} JSON File Structure Guide
            </button>
          </div>

          {/* Instructions Panel */}
          {showInstructions && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: '32px',
              border: '2px solid #667eea'
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600', color: '#667eea' }}>
                📘 JSON Configuration File Structure
              </h3>
              
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#4a5568' }}>
                <p style={{ marginBottom: '16px' }}>
                  Your JSON file should contain the following top-level fields:
                </p>

                <div style={{ background: '#f7fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                  <code style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                    {`{
  "domain": "Your Domain Name",
  "description": "Description of your privacy model",
  "dataTypes": [...],
  "contexts": [...],
  "privacyActions": [...],
  "services": [...]
}`}
                  </code>
                </div>

                <h4 style={{ marginTop: '24px', marginBottom: '12px', color: '#2d3748' }}>Required Fields:</h4>
                <ul style={{ marginLeft: '20px' }}>
                  <li><strong>domain</strong> (string): Name of your domain (e.g., "Automotive")</li>
                  <li><strong>dataTypes</strong> (array): List of data types like ["location.latitude", "speed.current", ...]</li>
                  <li><strong>contexts</strong> (array): Situational contexts with id, name, description, type</li>
                  <li><strong>services</strong> (array): Service definitions with their data requirements</li>
                </ul>

                <h4 style={{ marginTop: '24px', marginBottom: '12px', color: '#2d3748' }}>Service Object Structure:</h4>
                <div style={{ background: '#f7fafc', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                  <code style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                    {`{
  "id": "naviapp",
  "name": "Navigation App",
  "icon": "🗺️",
  "description": "Turn-by-turn navigation",
  "dataTypes": [
    {
      "type": "location.precise",
      "purpose": "Navigation",
      "required": true,
      "retention": "stated-purpose"
    }
  ]
}`}
                  </code>
                </div>

                <h4 style={{ marginTop: '24px', marginBottom: '12px', color: '#2d3748' }}>Example Based On:</h4>
                <p>
                  See the <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>domain-config-maps.json</code> file 
                  for a complete working example with Apple Maps, Google Maps, and OpenStreetMap configurations.
                </p>

                <div style={{ marginTop: '20px', padding: '16px', background: '#edf2f7', borderRadius: '8px', borderLeft: '4px solid #4299e1' }}>
                  <strong>💡 Tip:</strong> Start by copying the example file and modify it for your specific use case. 
                  The system will validate your JSON structure before accepting the upload.
                </div>
              </div>
            </div>
          )}

          {/* Upload Status */}
          {uploadStatus === 'success' && (
            <div style={{
              padding: '16px 20px',
              background: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '8px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <CheckCircle size={24} color="#155724" />
              <div>
                <div style={{ fontWeight: '600', color: '#155724' }}>
                  Configuration Uploaded Successfully!
                </div>
                <div style={{ fontSize: '14px', color: '#155724', marginTop: '4px' }}>
                  User dashboards will now use the new configuration with dynamic dropdowns.
                </div>
              </div>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div style={{
              padding: '16px 20px',
              background: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '8px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <XCircle size={24} color="#721c24" />
              <div style={{ color: '#721c24', fontWeight: '600' }}>
                Upload Failed
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div style={{
              padding: '16px 20px',
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <AlertCircle size={24} color="#856404" />
                <div style={{ fontWeight: '600', color: '#856404' }}>
                  Validation Errors:
                </div>
              </div>
              <ul style={{ margin: 0, paddingLeft: '36px', color: '#856404' }}>
                {validationErrors.map((error, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Upload Area */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '32px'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>
              Upload Configuration File
            </h3>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              style={{
                border: `2px dashed ${isDragging ? '#667eea' : validationErrors.length > 0 ? '#dc3545' : '#dee2e6'}`,
                borderRadius: '12px',
                padding: '48px',
                textAlign: 'center',
                background: isDragging ? '#f0f4ff' : '#fafbfc',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
            >
              <Upload size={48} color={isDragging ? '#667eea' : '#6c757d'} style={{ margin: '0 auto 16px' }} />
              
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
                {selectedFile ? selectedFile.file.name : 'Drop your JSON file here'}
              </div>
              
              <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '20px' }}>
                or click to browse
              </div>

              <input
                type="file"
                accept=".json"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                style={{ display: 'none' }}
                id="file-upload"
              />
              
              <label
                htmlFor="file-upload"
                style={{
                  display: 'inline-block',
                  padding: '12px 32px',
                  background: '#667eea',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  border: 'none'
                }}
              >
                Select File
              </label>
            </div>

            {selectedFile && (
              <div style={{ marginTop: '24px' }}>
                <div style={{
                  padding: '16px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <FileText size={20} color="#28a745" />
                    <div style={{ fontWeight: '600', color: '#28a745' }}>
                      File validated successfully
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6c757d' }}>
                  <div><strong>Domain:</strong> {selectedFile.config.domain || selectedFile.config.configName}</div>
                  <div><strong>Data Types:</strong> {selectedFile.config.dataTypes?.length || 0}</div>
                  <div><strong>Contexts/Situations:</strong> {(selectedFile.config.contexts || selectedFile.config.situations)?.length || 0}</div>
                  <div><strong>Services/Purposes:</strong> {(selectedFile.config.services || selectedFile.config.purposes)?.length || 0}</div>
                </div>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploadStatus === 'uploading'}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: uploadStatus === 'uploading' ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: uploadStatus === 'uploading' ? 'not-allowed' : 'pointer'
                  }}
                  >
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Configuration'}
                </button>
              </div>
            )}
          </div>

          {/* Current Configuration */}
          {currentConfig && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>
                Current Configuration
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Domain</div>
                  <div style={{ fontSize: '18px', fontWeight: '600' }}>{currentConfig.domain || currentConfig.configName}</div>
                </div>
                <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Data Types</div>
                  <div style={{ fontSize: '18px', fontWeight: '600' }}>{currentConfig.dataTypes?.length || 0}</div>
                </div>
                <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Contexts</div>
                  <div style={{ fontSize: '18px', fontWeight: '600' }}>{(currentConfig.contexts || currentConfig.situations)?.length || 0}</div>
                  </div>
                <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Services</div>
                  <div style={{ fontSize: '18px', fontWeight: '600' }}>{(currentConfig.services || currentConfig.purposes)?.length || 0}</div>
                </div>
              </div>

              <details style={{ cursor: 'pointer' }}>
                <summary style={{ fontWeight: '600', padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                  View Full Configuration
                </summary>
                <pre style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: '#2c3e50',
                  color: '#a6e3a1',
                  borderRadius: '8px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '400px'
                }}>
                  {JSON.stringify(currentConfig, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DomainExpertUpload;