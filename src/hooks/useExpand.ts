import { useEffect, useState } from 'react';

export interface ExpandState {
  ratio: number | undefined;
  setRatio: React.Dispatch<React.SetStateAction<number | undefined>>;
  ratioStr: string | undefined;
  setRatioStr: React.Dispatch<React.SetStateAction<string | undefined>>;
  times: number;
  setTimes: React.Dispatch<React.SetStateAction<number>>;
  type: 'original' | 'custom' | undefined;
  setType: React.Dispatch<React.SetStateAction<'original' | 'custom' | undefined>>;
}

const useExpand = (): ExpandState => {
  const [ratio, setRatio] = useState<number>();
  const [ratioStr, setRatioStr] = useState<string>();
  const [times, setTimes] = useState<number>(1.5);
  const [type, setType] = useState<'original' | 'custom'>();

  useEffect(() => {
    if (type === 'original') {
      setRatio(1);
      setRatioStr('');
    }
  }, [type]);

  return { ratio, setRatio, ratioStr, setRatioStr, times, setTimes, type, setType };
};

export default useExpand;
