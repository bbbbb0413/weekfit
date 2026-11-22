package com.modi.plan;

import java.util.List;
import java.util.Optional;

public record Outfit(List<Piece> pieces, int warmth, List<String> reasons) {

    public record Piece(OutfitSlot slot, Garment garment) {
    }

    public Outfit {
        pieces = List.copyOf(pieces);
        reasons = List.copyOf(reasons);
    }

    public Optional<Garment> in(OutfitSlot slot) {
        return pieces.stream().filter(p -> p.slot() == slot).map(Piece::garment).findFirst();
    }

    public List<Garment> garments() {
        return pieces.stream().map(Piece::garment).toList();
    }
}
