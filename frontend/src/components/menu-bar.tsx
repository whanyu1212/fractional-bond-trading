import React, { useState } from 'react';
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem } from './ui/menubar';
import { CreateCurrencyMarketDialog, CreateGeneralMarketDialog} from './market-create-dialog';

interface MenuProps {
    category: 'Currency' | 'General';
    setCategory: (category: 'Currency' | 'General') => void;
}

export function Menu({ category, setCategory }: MenuProps) {
    const [isCurrencyDialogOpen, setIsCurrencyDialogOpen] = useState(false);
    const [isGeneralDialogOpen, setIsGeneralDialogOpen] = useState(false);

    return (
        <Menubar className="mb-4 space-x-4">
            <MenubarMenu>
                <MenubarTrigger>Category: {category}</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem onSelect={() => setCategory('Currency')}>Currency</MenubarItem>
                    <MenubarItem onSelect={() => setCategory('General')}>General</MenubarItem>
                </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
                <MenubarTrigger>Create Market</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem onSelect={() => setIsCurrencyDialogOpen(true)}>Currency</MenubarItem>
                    <MenubarItem onSelect={() => setIsGeneralDialogOpen(true)}>General</MenubarItem>
                </MenubarContent>
            </MenubarMenu>
            <CreateCurrencyMarketDialog
                isOpen={isCurrencyDialogOpen}
                onOpenChange={setIsCurrencyDialogOpen}
            />
            <CreateGeneralMarketDialog
                isOpen={isGeneralDialogOpen}
                onOpenChange={setIsGeneralDialogOpen}
            />
        </Menubar>
    );
}