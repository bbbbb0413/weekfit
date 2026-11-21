// 기능: 옷 한 벌의 정보 & 상태 관리

import type { Clothing } from '../api/types';
import { CATEGORY_LABEL, FORMALITY_LABEL, STATUS_LABEL, WARMTH_LABEL, itemLabel } from '../lib/labels';
import { formatDeadline } from '../lib/date';
import { josa } from '../lib/josa';
import { useChangeStatus, useDeleteClothing, useStartLaundry } from '../hooks/queries';
import { ItemFigure } from './ItemFigure';
import { Sheet } from './Sheet';
import { useToast } from './Toast';

export function ItemSheet({ item, onEdit, onClose }: { item: Clothing; onEdit: () => void; onClose: () => void }) {
  const changeStatus = useChangeStatus();
  const startLaundry = useStartLaundry();
  const remove = useDeleteClothing();
  const toast = useToast((s) => s.show);
  const busy = changeStatus.isPending || startLaundry.isPending || remove.isPending;
  const name = itemLabel(item);

  const run = (action: Promise<unknown>, done: string) =>
    action
      .then(() => {
        toast(done);
        onClose();
      })
      .catch((error: Error) => toast(error.message));

  return (
    <Sheet title={name} onClose={onClose}>
      <div className="item-detail">
        <div className="item-detail__figure">
          <ItemFigure item={item} />
        </div>
        <dl className="facts">
          <div>
            <dt>종류</dt>
            <dd>{[CATEGORY_LABEL[item.category], item.subType].filter(Boolean).join(', ')}</dd>
          </div>
          <div>
            <dt>색</dt>
            <dd>{item.colors.join(', ')}</dd>
          </div>
          <div>
            <dt>두께</dt>
            <dd>
              {item.warmth} {WARMTH_LABEL[item.warmth]}
            </dd>
          </div>
          <div>
            <dt>격식</dt>
            <dd>
              {item.formality} {FORMALITY_LABEL[item.formality]}
            </dd>
          </div>
          <div>
            <dt>상태</dt>
            <dd>
              {STATUS_LABEL[item.status]}
              {item.status === 'DRYING' && item.dryUntil ? `, ${formatDeadline(item.dryUntil)}에 마름` : ''}
            </dd>
          </div>
          <div>
            <dt>세탁 후 착용</dt>
            <dd>
              {item.wearsSinceWash}번 입음, {item.washThreshold}번째에 세탁 권장
            </dd>
          </div>
        </dl>
      </div>

      <div className="stack">
        {item.status !== 'DRYING' && (
          <button
            type="button"
            className="button button--primary"
            disabled={busy}
            onClick={() => run(startLaundry.mutateAsync([item.id]), `${name} 세탁을 시작했어요.`)}
          >
            세탁 시작
          </button>
        )}
        {item.status !== 'AVAILABLE' && (
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => run(changeStatus.mutateAsync({ id: item.id, status: 'AVAILABLE' }), '입을 수 있음으로 바꿨어요.')}
          >
            입을 수 있음으로 바꾸기
          </button>
        )}
        {item.status === 'AVAILABLE' && (
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => run(changeStatus.mutateAsync({ id: item.id, status: 'LAUNDRY' }), '세탁 대기로 옮겼어요.')}
          >
            세탁 대기로 옮기기
          </button>
        )}
        <button type="button" className="button" disabled={busy} onClick={onEdit}>
          정보 고치기
        </button>
        {item.status !== 'REPAIR' && (
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => run(changeStatus.mutateAsync({ id: item.id, status: 'REPAIR' }), '수선 중으로 바꿨어요.')}
          >
            수선 맡김으로 바꾸기
          </button>
        )}
        <button
          type="button"
          className="button button--danger"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`${josa(name, '을를')} 옷장에서 삭제할까요?`)) run(remove.mutateAsync(item.id), '옷장에서 삭제했어요.');
          }}
        >
          옷장에서 삭제
        </button>
      </div>
    </Sheet>
  );
}
