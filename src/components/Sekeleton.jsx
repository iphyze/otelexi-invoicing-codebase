import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useThemeStore from '../stores/useThemeStore';

const Skeleton = () => {
    const { theme } = useThemeStore();

    return (
        <div className={`sinv-skeleton theme-${theme}`}>
            <div className="sinv-skel-hero">
                <div className="sinv-skel-block" style={{ width: '30%', height: 28 }} />
                <div className="sinv-skel-block" style={{ width: '20%', height: 18 }} />
            </div>
            {[...Array(5)].map((_, i) => <div key={i} className="sinv-skel-block" style={{ width: `${60 + i * 8}%`, height: 14, marginTop: 10 }} />)}
        </div>
    );

};

export default Skeleton;