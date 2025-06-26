import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import N8nUploader from '../components/N8nUploader';
import './MappingPage.css';

export default function MappingPage() {
  const navigate = useNavigate();

  // If you need to fetch any initial data, you could use useEffect here
  // For now, this page simply renders the uploader

  return (
    <div className="page-container">
      <h1 className="page-title">Mapping Page</h1>
      <p className="page-description">
        Upload your mapping file below to trigger the n8n workflow.
      </p>

      {/* File upload component */}
      <div className="uploader-wrapper">
        <N8nUploader />
      </div>
    </div>
  );
}
