import React, { useState } from 'react';
import { Upload, Button, message, Alert, Spin, Card } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { uploadOutageData } from '../../services/api';

const ExcelUpload = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);

  const beforeUpload = (file) => {
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel';
    if (!isExcel) {
      message.error('You can only upload Excel files!');
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('File must be smaller than 10MB!');
      return false;
    }

    return true;
  };

  // Improved getFieldValue to handle trimmed keys
  const getFieldValue = (item, possibleNames) => {
    for (const name of possibleNames) {
      // Check original key
      if (item[name] !== undefined && item[name] !== null && String(item[name]).trim() !== '') {
        return item[name];
      }
      // Check trimmed key (in case Excel headers have extra spaces)
      const trimmedName = String(name).trim();
      for (const key in item) {
        if (Object.prototype.hasOwnProperty.call(item, key) && String(key).trim().toLowerCase() === trimmedName.toLowerCase()) {
            if (item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '') {
                return item[key];
            }
        }
      }
    }
    return null;
  };


  const transformExcelDataForBackend = (jsonData, headerRowIndex) => {
    return jsonData.map((item, index) => {
      // Map raw Excel headers to schema names (or derived names)
      const transformedItem = {
        // No 'key' or 'rowNumber' needed for backend payload
        
        // Direct mappings from your outage excel (image_4d5347.png)
        State: getFieldValue(item, ['State']),
        'Tenant Site ID': getFieldValue(item, ['Tenant Site ID', 'TenantSiteID', 'Tenant_Site_ID']),
        'Site ID': getFieldValue(item, ['Site ID', 'SiteID', 'Site_ID']),
        'IHS Site Name': getFieldValue(item, ['IHS Site Name', 'IHSSiteName', 'IHS_Site_Name']),
        'State/District': getFieldValue(item, ['State/District', 'State District', 'State_District']),
        'Incident State': getFieldValue(item, ['Incident State', 'IncidentState', 'Incident_State']),
        Tenant: getFieldValue(item, ['Tenant']),
        Priority: getFieldValue(item, ['Priority']),
        'Outage Start Time': getFieldValue(item, ['Outage Start Time', 'OutageStartTime', 'Outage_Start_Time']),
        'Outage End Time': getFieldValue(item, ['Outage End Time', 'OutageEndTime', 'Outage_End_Time']),
        'Outage Duration': getFieldValue(item, ['Outage Duration', 'OutageDuration', 'Outage_Duration']),
        'Resolution Comments': getFieldValue(item, ['Resolution Comments', 'ResolutionComments', 'Resolution_Comments']),
        'Primary Cause': getFieldValue(item, ['Primary Cause', 'PrimaryCause', 'Primary_Cause']),
        'RCA 1': getFieldValue(item, ['RCA 1', 'RCA1']),
        'RCA 2': getFieldValue(item, ['RCA 2', 'RCA2']),
        'RCA 3': getFieldValue(item, ['RCA 3', 'RCA3']),
        'Parent Tenant Outage': getFieldValue(item, ['Parent Tenant Outage', 'ParentTenantOutage', 'Parent_Tenant_Outage']),
        'Cascaded Sites': getFieldValue(item, ['Cascaded Sites', 'CascadedSites']),
        'Incident Ref': getFieldValue(item, ['Incident Ref', 'IncidentRef', 'Incident_Ref']),
        'Cascaded outage': getFieldValue(item, ['Cascaded outage', 'CascadedOutage']),
        'Cascaded Tenant count': getFieldValue(item, ['Cascaded Tenant count', 'CascadedTenantCount', 'Cascaded_Tenant_count']),
        Number: getFieldValue(item, ['Number']), // This is TT Ticket Number from your data
      };
      return transformedItem;
    });
  };

  const handleUpload = async (info) => {
    const { file } = info;
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        setUploading(true);

        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: null,
          blankrows: false,
        });

        if (jsonData.length < 1) {
          message.error('Excel file is empty.');
          setUploading(false);
          return;
        }

        let headerRowIndex = -1;
        const headerSearchDepth = Math.min(15, jsonData.length);
        const headerIdentifiers = [
          'State', 'Tenant Site ID', 'Site ID', 'IHS Site Name', 'RCA 1',
          'Parent Tenant Outage', 'Outage Start Time', 'Cascaded Sites', 'Cascaded Tenant count', 'Incident Ref'
        ]; // Key headers to look for

        for (let i = 0; i < headerSearchDepth; i++) {
          const row = jsonData[i];
          if (row && Array.isArray(row) && headerIdentifiers.every(id =>
            row.some(cell => String(cell || '').trim().toLowerCase() === id.toLowerCase()) // Ensure all key headers are present
          )) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          message.error(
            "Could not identify header row. Please ensure your Excel file has the correct format with essential headers like 'Tenant Site ID', 'Site ID', 'RCA 1', etc. (Checked first 15 rows)",
            10
          );
          setUploading(false);
          return;
        }

        const headers = jsonData[headerRowIndex].map(h =>
          h ? String(h).trim() : null
        );

        const dataRows = jsonData.slice(headerRowIndex + 1).filter(row =>
          row && Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
        );

        const objectData = dataRows.map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            if (header) {
              obj[header] = row[index] !== undefined ? row[index] : null;
            }
          });
          return obj;
        });

        if (objectData.length === 0) {
          message.error("No valid data rows found after header row.");
          setUploading(false);
          return;
        }

        const transformedData = transformExcelDataForBackend(objectData, headerRowIndex);

        const chunkSize = 50;
        const totalChunks = Math.ceil(transformedData.length / chunkSize);
        let processedCount = 0;
        let errorCount = 0;
        let skippedLocalCount = 0;

        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = start + chunkSize;
          const chunk = transformedData.slice(start, end);

          const validChunkForUpload = [];
          chunk.forEach(outage => {
            const tenantSiteId = outage['Tenant Site ID'];
            const siteId = outage['Site ID'];

            // Check for essential identifiers. If missing, skip this record for upload.
            // These are used for the upsert filter in bulkWrite.
            if (tenantSiteId && String(tenantSiteId).trim() !== '' && siteId && String(siteId).trim() !== '') {
              validChunkForUpload.push(outage);
            } else {
              skippedLocalCount++;
              console.warn(`Skipped record due to missing Tenant Site ID or Site ID (Row probably empty or malformed):`, outage);
            }
          });

          if (validChunkForUpload.length > 0) {
            try {
              const response = await uploadOutageData(validChunkForUpload); // Use the api.js service
              processedCount += validChunkForUpload.length;
              if (response.data.upsertedCount > 0 || response.data.modifiedCount > 0) {
                // message.success(`Chunk ${i + 1} uploaded: ${response.data.upsertedCount} new, ${response.data.modifiedCount} updated.`);
              }
            } catch (error) {
              console.error('Chunk upload error:', error);
              if (error.response && error.response.status === 409) {
                  // This is the duplicate key error. It means some records in the chunk were duplicates
                  // based on the upsert filter ({ 'Tenant Site ID', 'Site ID' }).
                  // The backend now gives a more specific message for this.
                  message.warn(`Chunk ${i + 1} partially failed: ${error.response.data.error || 'Duplicate record detected.'}`);
                  errorCount += validChunkForUpload.length; // Count these as failed for overall stats
              } else {
                  message.error(`Chunk ${i + 1} failed to upload: ${error.response?.data?.error || error.message}`);
                  errorCount += validChunkForUpload.length;
              }
            }
          }
        }

        if (processedCount > 0 || skippedLocalCount > 0 || errorCount > 0) {
          message.success({
            content: (
              <span>
                Upload process completed: {processedCount} records processed.
                {skippedLocalCount > 0 && (
                  <span style={{ marginLeft: 8 }}>({skippedLocalCount} records skipped locally due to missing essential IDs)</span>
                )}
                {errorCount > 0 && (
                  <span style={{ color: 'red', marginLeft: 8 }}>
                    ({errorCount} records failed or had conflicts on the server)
                  </span>
                )}
              </span>
            ),
            duration: 8,
          });
          if (onUploadSuccess) {
            onUploadSuccess(); 
          }
        } else {
          message.error(
            `No valid records were uploaded from ${transformedData.length} total records. Check file format and ensure 'Tenant Site ID' and 'Site ID' are present.`
          );
        }
      } catch (error) {
        console.error('Upload error:', error);
        message.error(error.response?.data?.error || 'Error processing file. Please check the format.');
      } finally {
        setUploading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <Card title="Upload Outage Data" style={{ marginBottom: 24 }}>
      <Alert
        message="Upload Requirements"
        description={
          <ul>
            <li>Must be an Excel file (.xlsx, .xls)</li>
            <li>Should contain a header row with column titles (e.g., 'Tenant Site ID', 'Site ID', 'RCA 1', 'Outage Start Time')</li>
            <li>Each record must have a 'Tenant Site ID' and 'Site ID' for proper identification and upserting.</li>
            <li>Files with multiple header rows or metadata are supported (looks for headers in the first 15 rows).</li>
            <li>Maximum file size: 10MB</li>
          </ul>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Upload
        accept=".xlsx,.xls"
        beforeUpload={beforeUpload}
        customRequest={handleUpload}
        showUploadList={false}
        disabled={uploading}
      >
        <Button icon={<UploadOutlined />} loading={uploading} type="primary">
          Upload Outage Excel File
        </Button>
      </Upload>
      {uploading && <Spin tip="Uploading and processing..." style={{ marginTop: 16 }} />}
    </Card>
  );
};

export default ExcelUpload;