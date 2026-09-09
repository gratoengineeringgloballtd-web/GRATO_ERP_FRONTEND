export const calculateDuration = (start, end) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime - startTime;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };
  
  export const calculatePenalties = (breakdowns) => {
    return breakdowns.map(breakdown => {
      if (breakdown.companyInCharge !== 'GRATO') {
        return { ...breakdown, penalty: 0 };
      }
      
      const durationHours = parseFloat(breakdown.duration.split(':')[0]);
      let penalty = 0;
      
      if (durationHours > 2) {
        const excessHours = durationHours - 2;
        const basePenalty = 50000;
        
        // Apply priority multiplier
        let multiplier = 1;
        if (breakdown.priority === 'P1') multiplier = 2;
        else if (breakdown.priority === 'P2') multiplier = 1.5;
        else if (breakdown.priority === 'P3') multiplier = 1.2;
        
        penalty = basePenalty * excessHours * multiplier;
      }
      
      return { ...breakdown, penalty };
    });
  };
  
  export const aggregateKPIs = (breakdowns) => {
    const gratoBreakdowns = breakdowns.filter(b => b.companyInCharge === 'GRATO');
    
    // Calculate total duration in hours
    const totalDuration = gratoBreakdowns.reduce((sum, b) => {
      const [hours, minutes] = b.duration.split(':').map(Number);
      return sum + hours + (minutes / 60);
    }, 0);
    
    const avgDuration = totalDuration / gratoBreakdowns.length || 0;
    
    // Format as HH:MM
    const avgHours = Math.floor(avgDuration);
    const avgMinutes = Math.round((avgDuration % 1) * 60);
    const formattedAvgDuration = `${avgHours}:${avgMinutes.toString().padStart(2, '0')}`;
    
    // Calculate penalties
    const penalties = calculatePenalties(gratoBreakdowns);
    const totalPenalties = penalties.reduce((sum, p) => sum + p.penalty, 0);
    
    return {
      totalBreakdowns: breakdowns.length,
      gratoBreakdowns: gratoBreakdowns.length,
      avgDuration: formattedAvgDuration,
      totalPenalties,
      penalties
    };
  };