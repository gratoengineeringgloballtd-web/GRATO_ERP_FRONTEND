import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const uploadBreakdownData = createAsyncThunk(
  'analyst/uploadBreakdownData',
  async (file, { rejectWithValue }) => {
    try {
      const response = await api.uploadBreakdownData(file);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const fetchBreakdownStats = createAsyncThunk(
    'analyst/fetchBreakdownStats',
    async (params, { rejectWithValue }) => {
      try {
        const response = await api.getBreakdownStats(params);
        return {
          totalBreakdowns: response.data.totalBreakdowns || 0,
          avgDuration: response.data.avgDuration || '0:00',
          maxDuration: response.data.maxDuration || '0:00',
          gratoResponsible: response.data.gratoResponsible || 0,
          totalPenalties: response.data.totalPenalties || 0,
          clusters: response.data.clusters || []
        };
      } catch (error) {
        return rejectWithValue(error.response?.data || { message: 'Failed to fetch stats' });
      }
    }
  );

const analystSlice = createSlice({
  name: 'analyst',
  initialState: {
    breakdownData: [],
    stats: {
        totalBreakdowns: 0,
        avgDuration: '0:00',
        maxDuration: '0:00',
        gratoResponsible: 0,
        totalPenalties: 0,
        clusters: []
    },
    loading: false,
    error: null,
    uploadProgress: 0
  },
  reducers: {
    clearAnalystError: (state) => {
      state.error = null;
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadBreakdownData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadBreakdownData.fulfilled, (state, action) => {
        state.loading = false;
        state.breakdownData = action.payload.data;
        state.stats = action.payload.stats;
      })
      .addCase(uploadBreakdownData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to upload data';
      })
      .addCase(fetchBreakdownStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBreakdownStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchBreakdownStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch stats';
      });
  }
});

export const { clearAnalystError, setUploadProgress } = analystSlice.actions;
export default analystSlice.reducer;
