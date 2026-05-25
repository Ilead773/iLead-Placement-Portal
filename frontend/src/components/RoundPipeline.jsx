import React from 'react';
import { Check, X, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const RoundPipeline = ({ rounds, currentRound }) => {
  if (!rounds || rounds.length === 0) return null;

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
        
        {rounds.map((round, index) => {
          let status = round.status;
          let bgColor = 'bg-gray-200';
          let textColor = 'text-gray-500';
          let Icon = Clock;
          
          if (status === 'cleared') {
            bgColor = 'bg-green-500';
            textColor = 'text-green-700';
            Icon = Check;
          } else if (status === 'failed') {
            bgColor = 'bg-red-500';
            textColor = 'text-red-700';
            Icon = X;
          } else if (status === 'scheduled') {
            bgColor = 'bg-blue-500';
            textColor = 'text-blue-700';
            Icon = Calendar;
          }

          return (
            <div key={round.id} className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${bgColor} border-4 border-white shadow-sm`}>
                <Icon size={16} />
              </div>
              <div className="mt-2 text-center">
                <p className="text-xs font-bold text-gray-800">Round {round.round_number}</p>
                <p className={`text-xs ${textColor} font-medium`}>{round.round_name}</p>
                {round.scheduled_date && status === 'scheduled' && (
                  <p className="text-[10px] text-gray-500 mt-1">{format(new Date(round.scheduled_date), 'MMM dd, HH:mm')}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default RoundPipeline;
