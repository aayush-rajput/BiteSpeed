import { Router, Request, Response } from 'express';
import { prisma } from './db';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    try {
        const { email, phoneNumber } = req.body;

        if (!email && !phoneNumber) {
            return res.status(400).json({ error: 'Either email or phoneNumber must be provided' });
        }

        const emailStr = email ? String(email) : undefined;
        const phoneStr = phoneNumber ? String(phoneNumber) : undefined;

        // 1. Find directly matching contacts
        const matchingContacts = await prisma.contact.findMany({
            where: {
                OR: [
                    ...(emailStr ? [{ email: emailStr }] : []),
                    ...(phoneStr ? [{ phoneNumber: phoneStr }] : [])
                ]
            }
        });

        if (matchingContacts.length === 0) {
            // 2. No existing contacts -> create new primary
            const newContact = await prisma.contact.create({
                data: {
                    email: emailStr,
                    phoneNumber: phoneStr,
                    linkPrecedence: 'primary'
                }
            });
            return res.status(200).json({
                contact: {
                    primaryContatctId: newContact.id,
                    emails: newContact.email ? [newContact.email] : [],
                    phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
                    secondaryContactIds: []
                }
            });
        }

        // 3. Find all primary IDs for the matched contacts
        const primaryIds = new Set<number>();
        for (const c of matchingContacts) {
            if (c.linkPrecedence === 'primary') {
                primaryIds.add(c.id);
            } else if (c.linkedId) {
                primaryIds.add(c.linkedId);
            }
        }

        // 4. Fetch the full cluster of contacts belonging to these primary IDs
        const clusterContacts = await prisma.contact.findMany({
            where: {
                OR: [
                    { id: { in: Array.from(primaryIds) } },
                    { linkedId: { in: Array.from(primaryIds) } }
                ]
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        // 5. Determine the absolute primary contact (the oldest one in the cluster)
        // clusterContacts are already ordered by createdAt ascending
        const absolutePrimary = clusterContacts[0];

        // We need to find if any other primaries need to be demoted
        const otherPrimaries = clusterContacts.filter(
            c => c.id !== absolutePrimary.id && c.linkPrecedence === 'primary'
        );

        // If there are other primaries, update them and their secondaries to link to absolutePrimary
        if (otherPrimaries.length > 0) {
            const otherPrimaryIds = otherPrimaries.map(c => c.id);

            // Update these primaries to secondaries
            await prisma.contact.updateMany({
                where: { id: { in: otherPrimaryIds } },
                data: {
                    linkPrecedence: 'secondary',
                    linkedId: absolutePrimary.id
                }
            });

            // Update their original secondaries to point to the absolutePrimary
            await prisma.contact.updateMany({
                where: { linkedId: { in: otherPrimaryIds } },
                data: {
                    linkedId: absolutePrimary.id
                }
            });

            // Update our local cluster list so the final response mapping sees the newly updated state
            for (const c of clusterContacts) {
                if (otherPrimaryIds.includes(c.id)) {
                    c.linkPrecedence = 'secondary';
                    c.linkedId = absolutePrimary.id;
                } else if (c.linkedId && otherPrimaryIds.includes(c.linkedId)) {
                    c.linkedId = absolutePrimary.id;
                }
            }
        }

        // 6. Check if we need to create a new secondary contact
        // A secondary contact should be created if the incoming request brings NEW information
        // (A new email or phone that doesn't exist in the cluster at all)
        const clusterEmails = new Set(clusterContacts.map(c => c.email).filter(Boolean));
        const clusterPhones = new Set(clusterContacts.map(c => c.phoneNumber).filter(Boolean));

        const hasNewEmail = emailStr && !clusterEmails.has(emailStr);
        const hasNewPhone = phoneStr && !clusterPhones.has(phoneStr);

        let newSecondaryId: number | null = null;
        if (hasNewEmail || hasNewPhone) {
            // NOTE: We only create ONE new secondary even if both email and phone are new to the cluster.
            // But we shouldn't create a secondary if the incoming request ONLY matched by email and the phone inside is null
            // etc. Wait, the rule is "if it contains new info".
            // E.g. Request has email: mcfly@..., phone: 1234. Both weren't in the cluster yet?
            // Wait, if BOTH weren't in the cluster, how did matchingContacts find anything?
            // It couldn't. matchingContacts wouldn't be empty only if we had at least ONE match.
            // So at most one of them is new.
            const newContact = await prisma.contact.create({
                data: {
                    email: emailStr,
                    phoneNumber: phoneStr,
                    linkedId: absolutePrimary.id,
                    linkPrecedence: 'secondary'
                }
            });
            clusterContacts.push(newContact);
        }

        // 7. Format the response
        // Primary's email/phone should be first.
        const emails = new Set<string>();
        const phones = new Set<string>();

        if (absolutePrimary.email) emails.add(absolutePrimary.email);
        if (absolutePrimary.phoneNumber) phones.add(absolutePrimary.phoneNumber);

        for (const c of clusterContacts) {
            if (c.email) emails.add(c.email);
            if (c.phoneNumber) phones.add(c.phoneNumber);
        }

        const secondaryContactIds = clusterContacts
            .filter(c => c.id !== absolutePrimary.id)
            .map(c => c.id);

        return res.status(200).json({
            contact: {
                primaryContatctId: absolutePrimary.id, // Notice the typo required by the specs "primaryContatctId"
                emails: Array.from(emails),
                phoneNumbers: Array.from(phones),
                secondaryContactIds
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
